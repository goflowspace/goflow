import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R, T> {
      toBeInTheDocument(): R;
      toHaveStyle(style: Record<string, string>): R;
    }
  }
}

export {};
