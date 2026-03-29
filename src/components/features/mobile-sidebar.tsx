"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MenuIcon, XIcon } from "lucide-react";

export function MobileSidebarToggle() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-white">Sprint Tracker</span>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in sidebar on mobile */}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-gray-950 border-r border-gray-800 transform transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-end px-4 py-3">
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        {/* The sidebar content is rendered as children via the slot */}
      </div>
    </>
  );
}

export function MobileSidebarContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-white">Sprint Tracker</span>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile slide-out sidebar */}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-gray-950 border-r border-gray-800 transform transition-transform duration-200 ease-out overflow-y-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-end px-4 py-3 border-b border-gray-800">
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
