import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';

export function AppLayout() {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 h-full overflow-y-auto">
        <div className="container py-6 px-4 md:px-6 lg:px-8 max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
