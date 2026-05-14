export default function POSLayout({ children, }) {
    // POS has its own fullscreen layout - no sidebar to avoid distraction
    return (<div className="h-screen overflow-hidden bg-background">
      {children}
    </div>);
}
