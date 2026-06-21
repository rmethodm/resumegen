import { Dropdown } from 'resumegen';
import { useEffect, useRef } from 'react';

function OpenDropdown({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const trigger = ref.current?.querySelector('div');
    if (trigger) trigger.click();
  }, []);
  return <div ref={ref}>{children}</div>;
}

export function AccountMenu() {
  return (
    <div style={{ paddingBottom: '160px' }}>
      <OpenDropdown>
        <Dropdown>
          <Dropdown.Trigger>
            <button className="flex items-center gap-1 rounded bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50">
              My Account
              <svg className="ml-1 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <div className="py-1">
              <div className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Profile</div>
              <div className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Billing</div>
              <div className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer">Sign Out</div>
            </div>
          </Dropdown.Content>
        </Dropdown>
      </OpenDropdown>
    </div>
  );
}
