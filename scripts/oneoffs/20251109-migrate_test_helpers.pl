#!/usr/bin/env perl
use strict;
use warnings;
use v5.10;
use File::Slurp qw(read_file write_file);
use Getopt::Long;

my $FILE_PATTERN = 'e2e/*.spec.js';

# Track statistics
my %stats = (
    waitForProjectContent => 0,
    waitForProjectsList => 0,
    waitForTab => 0,
    waitForAlpineInit => 0,
    waitForAutoOpenedProject => 0,
    justified_terminal => 0,
    justified_animation => 0,
    justified_other => 0,
);

sub process_file {
    my ($file, $dry_run) = @_;
    my $content = read_file($file);
    my $original = $content;

    # Transform 1: PROJECT_DETAIL → waitForProjectContent (16 uses)
    my $count = ($content =~ s{await\s+mainWindow\.waitForTimeout\(PROJECT_DETAIL\);}
                               {await waitForProjectContent(mainWindow);}g);
    $stats{waitForProjectContent} += $count;

    # Transform 2: PROJECT_LOAD after "auto-open" comment → waitForAutoOpenedProject (18 uses)
    # Pattern: "// Wait for projects to load and hegel-ide to auto-open" followed by PROJECT_LOAD
    $count = ($content =~ s{(//[^\n]*auto-open[^\n]*\n\s*)await\s+mainWindow\.waitForTimeout\(PROJECT_LOAD\);}
                           {$1await waitForAutoOpenedProject(mainWindow);}gi);
    $stats{waitForAutoOpenedProject} += $count;

    # Transform 3: ALPINE_INIT right after mainWindow declaration → waitForAlpineInit
    # Pattern: const mainWindow = ... followed by waitForTimeout(ALPINE_INIT) (allowing comments/blanks)
    $count = ($content =~ s{(const\s+mainWindow\s*=\s*windows\.find\([^)]+\);\s*\n(?:\s*//[^\n]*\n|\s*\n)*)\s*await\s+mainWindow\.waitForTimeout\(ALPINE_INIT\);}
                           {$1    await waitForAlpineInit(mainWindow);}g);
    $stats{waitForAlpineInit} += $count;

    # Transform 4: ALPINE_INIT after projectsTab.click() → waitForProjectsList
    $count = ($content =~ s{(await\s+projectsTab\.click\(\);\s*\n)\s*await\s+mainWindow\.waitForTimeout\(ALPINE_INIT\);}
                           {$1    await waitForProjectsList(mainWindow);}g);
    $stats{waitForProjectsList} += $count;

    # Transform 5: TAB_CREATE → waitForTab (detect tab name from context)
    # This is complex, need line-by-line processing
    my @lines = split /\n/, $content;
    my $lines_modified = 0;

    for my $i (0 .. $#lines - 2) {
        # Pattern: await someButton.click();
        #          await mainWindow.waitForTimeout(TAB_CREATE);
        #          (nearby) const tab = mainWindow.locator(...).filter({ hasText: 'TabName' })

        if ($lines[$i] =~ /await\s+\w+\.click\(\);/ &&
            $lines[$i+1] =~ /^\s*await\s+mainWindow\.waitForTimeout\(TAB_CREATE\);/) {

            # Look ahead for tab locator with hasText
            for my $j ($i+2 .. min($i+15, $#lines)) {
                # Match explicit string: hasText: 'TabName'
                if ($lines[$j] =~ /\.(left|right)-pane.*\.tab.*hasText:\s*['"]([^'"]+)['"]/) {
                    my ($pane, $tab_name) = ($1, $2);
                    $lines[$i+1] = "    await waitForTab(mainWindow, '$tab_name', '$pane');";
                    $stats{waitForTab}++;
                    $lines_modified = 1;
                    last;
                }
                # Match variable: hasText: projectName
                elsif ($lines[$j] =~ /\.(left|right)-pane.*\.tab.*hasText:\s*(\w+)/ && $2 ne 'hasText') {
                    my ($pane, $var_name) = ($1, $2);
                    $lines[$i+1] = "    await waitForTab(mainWindow, $var_name, '$pane');";
                    $stats{waitForTab}++;
                    $lines_modified = 1;
                    last;
                }
            }
        }
    }

    $content = join("\n", @lines) if $lines_modified;

    # Transform 6: Add justification comments for remaining timeouts

    # Terminal I/O waits - no DOM state to poll
    $count = ($content =~ s{^(\s*)(await\s+mainWindow\.waitForTimeout\((TERMINAL_READY|TERMINAL_EXEC|TERMINAL_EXEC_FAST)\);)}
                           {$1// Justified: waiting for terminal I/O, no reliable DOM state\n$1$2}gm);
    $stats{justified_terminal} += $count;

    # Animation waits - CSS transitions with no intermediate state
    $count = ($content =~ s{^(\s*)(await\s+mainWindow\.waitForTimeout\(TAB_CLOSE\);)}
                           {$1// Justified: waiting for tab close animation\n$1$2}gm);
    $stats{justified_animation} += $count;

    # Other timeouts (100ms, 200ms, etc.) - add justification placeholder
    $count = ($content =~ s{^(\s*)(await\s+mainWindow\.waitForTimeout\((100|200|2500|SPLIT_PANE_INIT|HEGEL_CMD)\);)}
                           {$1// TODO: review if this timeout can be replaced with a helper\n$1$2}gm);
    $stats{justified_other} += $count;

    return 0 unless $content ne $original;

    # Update imports if we made changes
    my @needed;
    push @needed, 'waitForProjectContent' if $stats{waitForProjectContent};
    push @needed, 'waitForProjectsList' if $stats{waitForProjectsList};
    push @needed, 'waitForTab' if $stats{waitForTab};
    push @needed, 'waitForAlpineInit' if $stats{waitForAlpineInit};
    push @needed, 'waitForAutoOpenedProject' if $stats{waitForAutoOpenedProject};

    if (@needed) {
        if ($content =~ /const \{ ([^}]+) \} = require\('\.\/test-constants'\);/) {
            my $existing = $1;
            my @imports = split /,\s*/, $existing;
            my %has = map { $_ => 1 } @imports;

            for my $helper (@needed) {
                push @imports, $helper unless $has{$helper};
            }

            my $new_imports = join(', ', @imports);
            $content =~ s{const \{ \Q$existing\E \} = require\('\.\/test-constants'\);}{const { $new_imports } = require('./test-constants');}g;
        } else {
            # Add new import after @playwright/test
            my $import_line = "const { " . join(', ', @needed) . " } = require('./test-constants');";
            $content =~ s{(const \{ test, expect \} = require\('\@playwright/test'\);)}{$1\n$import_line}g;
        }
    }

    if ($dry_run) {
        say "WOULD MODIFY: $file";
        say "  - waitForProjectContent: $stats{waitForProjectContent}" if $stats{waitForProjectContent};
        say "  - waitForProjectsList: $stats{waitForProjectsList}" if $stats{waitForProjectsList};
        say "  - waitForTab: $stats{waitForTab}" if $stats{waitForTab};
        say "  - waitForAlpineInit: $stats{waitForAlpineInit}" if $stats{waitForAlpineInit};
        say "  - waitForAutoOpenedProject: $stats{waitForAutoOpenedProject}" if $stats{waitForAutoOpenedProject};
        say "  - Justified (terminal): $stats{justified_terminal}" if $stats{justified_terminal};
        say "  - Justified (animation): $stats{justified_animation}" if $stats{justified_animation};
        say "  - TODO comments: $stats{justified_other}" if $stats{justified_other};
    } else {
        write_file($file, $content);
        say "MODIFIED: $file";
    }

    return 1;
}

sub min { $_[0] < $_[1] ? $_[0] : $_[1] }

# Main
my $dry_run = 0;
GetOptions('dry-run' => \$dry_run) or die "Usage: $0 [--dry-run]\n";

my @files = glob($FILE_PATTERN);
my $total_files = @files;
my $modified_files = 0;
my %total_stats = map { $_ => 0 } keys %stats;

for my $file (@files) {
    %stats = map { $_ => 0 } keys %stats;
    if (process_file($file, $dry_run)) {
        $modified_files++;
        $total_stats{$_} += $stats{$_} for keys %stats;
    }
}

my $total_replaced = $total_stats{waitForProjectContent} +
                     $total_stats{waitForProjectsList} +
                     $total_stats{waitForTab} +
                     $total_stats{waitForAlpineInit} +
                     $total_stats{waitForAutoOpenedProject};

my $total_justified = $total_stats{justified_terminal} +
                      $total_stats{justified_animation} +
                      $total_stats{justified_other};

say "\n" . "=" x 60;
say ($dry_run ? "DRY RUN SUMMARY" : "MIGRATION SUMMARY");
say "=" x 60;
say "Files modified: $modified_files of $total_files";
say "";
say "Replaced with helpers:";
say "  waitForProjectContent:      $total_stats{waitForProjectContent}";
say "  waitForAutoOpenedProject:   $total_stats{waitForAutoOpenedProject}";
say "  waitForAlpineInit:          $total_stats{waitForAlpineInit}";
say "  waitForProjectsList:        $total_stats{waitForProjectsList}";
say "  waitForTab:                 $total_stats{waitForTab}";
say "  " . "-" x 35;
say "  Subtotal:                   $total_replaced";
say "";
say "Justified with comments:";
say "  Terminal I/O waits:         $total_stats{justified_terminal}";
say "  Animation waits:            $total_stats{justified_animation}";
say "  TODO (review needed):       $total_stats{justified_other}";
say "  " . "-" x 35;
say "  Subtotal:                   $total_justified";
say "";
say "=" x 60;
my $grand_total = $total_replaced + $total_justified;
say "TOTAL PROCESSED:              $grand_total";

my $total_timeouts = 114;
my $coverage = int($grand_total / $total_timeouts * 100);
say "COVERAGE:                     $coverage% of $total_timeouts waitForTimeout calls";
say "=" x 60;

if ($dry_run) {
    say "\nRun without --dry-run to apply changes";
} else {
    say "\nDone! Run 'npm test' to verify changes.";
}
