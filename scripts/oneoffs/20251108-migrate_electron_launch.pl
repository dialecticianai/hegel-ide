#!/usr/bin/env perl
use strict;
use warnings;
use v5.10;
use File::Slurp qw(read_file write_file);
use Getopt::Long;

# Patterns and replacements
my $OLD_IMPORT = q{const { test, expect, _electron: electron } = require('@playwright/test');};
my $NEW_IMPORT = q{const { test, expect } = require('@playwright/test');};
my $TEST_CONST = q{const { launchTestElectron } = require('./test-constants');};

my $FILE_PATTERN = 'e2e/*.spec.js';
my $EXCLUDE_PATTERN = qr/quit-test\.spec\.js$/;

# Generic file processor
sub process_file {
    my ($file, $dry_run) = @_;
    my $content = read_file($file);
    my $modified = 0;

    # Transform 1: Update imports
    if (index($content, $OLD_IMPORT) != -1) {
        # Check if there's already an import from test-constants that needs merging
        if ($content =~ /const \{ ([^}]+) \} = require\('\.\/test-constants'\);/) {
            my $existing = $1;
            my $merged = "$existing, launchTestElectron";
            $content =~ s{const \{ \Q$existing\E \} = require\('\.\/test-constants'\);}{const { $merged } = require('./test-constants');}g;
            $content =~ s{\Q$OLD_IMPORT\E}{$NEW_IMPORT}g;
        } else {
            $content =~ s{\Q$OLD_IMPORT\E}{$NEW_IMPORT\n$TEST_CONST}g;
        }
        $modified = 1;
    }

    # Transform 2: Replace electron.launch() calls
    my $old_launch = qr{const\s+electronApp\s+=\s+await\s+electron\.launch\(\{\s*args:\s*\['.'\]\s*\}\);};
    my $new_launch = q{const electronApp = await launchTestElectron();};
    if ($content =~ s{$old_launch}{$new_launch}g) {
        $modified = 1;
    }

    return 0 unless $modified;

    if ($dry_run) {
        say "WOULD MODIFY: $file";
    } else {
        write_file($file, $content);
        say "MODIFIED: $file";
    }

    return 1;
}

# Main
my $dry_run = 0;
GetOptions('dry-run' => \$dry_run) or die "Usage: $0 [--dry-run]\n";

my @files = grep { !/$EXCLUDE_PATTERN/ } glob($FILE_PATTERN);
my $total = @files;
my $modified = grep { process_file($_, $dry_run) } @files;

say $dry_run
    ? "\n--- DRY RUN SUMMARY ---\nWould modify $modified of $total files\nRun without --dry-run to apply"
    : "\n--- SUMMARY ---\nModified $modified of $total files";
