// Split-pane drag and resize functionality

export function createSplitPane() {
  return {
    // State
    leftPanelPercent: 60,
    isDragging: false,

    // Initialize split position from localStorage
    initSplitPosition() {
      const saved = localStorage.getItem('hegel-ide:split-position');
      if (saved) {
        try {
          const { leftPanelPercent } = JSON.parse(saved);
          if (leftPanelPercent >= 20 && leftPanelPercent <= 80) {
            this.leftPanelPercent = leftPanelPercent;
          }
        } catch (e) {
          console.warn('Failed to parse saved split position:', e);
        }
      }
    },

    // Drag handlers
    startDrag(event) {
      this.isDragging = true;
      const containerWidth = event.target.parentElement.offsetWidth;

      const handleMouseMove = (e) => {
        if (!this.isDragging) return;

        // Calculate new split position as percentage
        const newPercent = (e.clientX / containerWidth) * 100;

        // Clamp between 20% and 80%
        this.leftPanelPercent = Math.max(20, Math.min(80, newPercent));
      };

      const handleMouseUp = () => {
        if (this.isDragging) {
          this.isDragging = false;

          // Save to localStorage
          localStorage.setItem('hegel-ide:split-position', JSON.stringify({
            leftPanelPercent: this.leftPanelPercent
          }));

          // Resize active terminal after drag completes
          const activeTab = this.rightTabs.find(t => t.id === this.activeRightTab);
          if (activeTab && this.terminals[activeTab.terminalId]) {
            this.terminals[activeTab.terminalId].fitAddon.fit();
          }

          // Clean up listeners
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  };
}
