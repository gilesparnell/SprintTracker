"use client";
import { useState } from "react";
import { TagIcon, UsersIcon, LinkIcon, PackageIcon } from "lucide-react";

const tabs = [
  { id: "tags", label: "Tags", icon: TagIcon },
  { id: "customers", label: "Customers", icon: UsersIcon },
  { id: "products", label: "Products", icon: PackageIcon },
  { id: "clickup", label: "ClickUp", icon: LinkIcon },
];

export function SettingsTabs({ children }: { children: React.ReactNode[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 mb-6 w-fit">
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(i)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                active === i
                  ? "bg-gray-800 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      {children.map((child, i) => (
        <div key={i} className={active === i ? "" : "hidden"}>
          {child}
        </div>
      ))}
    </div>
  );
}
