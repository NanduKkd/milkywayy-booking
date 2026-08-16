import { render } from "@testing-library/react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/contexts/auth";

const AllTheProviders = ({ children, initialUser }) => {
  return (
    <AuthProvider initialUser={initialUser}>
      {children}
      <Toaster />
    </AuthProvider>
  );
};

const customRender = (ui, options) => {
  const { authProviderProps, ...renderOptions } = options || {};

  const Wrapper = ({ children }) => (
    <AllTheProviders initialUser={authProviderProps?.initialUser}>
      {children}
    </AllTheProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// re-export everything
export * from "@testing-library/react";

// override render method
export { customRender as render };
