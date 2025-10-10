import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginScreen } from "./LoginScreen";
import { useUserProfile } from "./UserProfileContext";
import { apiClient } from "../utils/apiClient";
import { toast } from "sonner";

vi.mock("./UserProfileContext", () => ({
  useUserProfile: vi.fn(),
}));

vi.mock("../utils/apiClient", () => ({
  apiClient: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("./ui/select", () => {

  const SelectContentComponent = ({ children }: any) => <>{children}</>;
  const SelectItemComponent = ({ value }: any) => (
    <option value={value}>{value}</option>
  );

  const SelectComponent = ({ value, onValueChange, children }: any) => {
    const options: Array<{ value: string }> = [];
    React.Children.forEach(children, (child: any) => {
      if (!React.isValidElement(child)) return;
      if (child.type === SelectContentComponent) {
        React.Children.forEach(child.props.children, (optionChild: any) => {
          if (!React.isValidElement(optionChild)) return;
          if (optionChild.props?.value) {
            options.push({ value: optionChild.props.value });
          }
        });
      }
    });

    return (
      <select
        data-testid="country-select"
        value={value}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        <option value="" disabled>
          Select country
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.value}
          </option>
        ))}
      </select>
    );
  };

  const SelectTriggerComponent = ({ children }: any) => <>{children}</>;
  const SelectValueComponent = () => null;

  return {
    Select: SelectComponent,
    SelectContent: SelectContentComponent,
    SelectItem: SelectItemComponent,
    SelectTrigger: SelectTriggerComponent,
    SelectValue: SelectValueComponent,
  };
});

describe("LoginScreen", () => {
  const useUserProfileMock = vi.mocked(useUserProfile);
  const apiClientMock = vi.mocked(apiClient);
  const toastMock = toast as unknown as {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    useUserProfileMock.mockReset().mockReturnValue({
      updateAppSettings: vi.fn(),
    });
    apiClientMock.mockReset();
    toastMock.info.mockReset();
    toastMock.error.mockReset();
    toastMock.success.mockReset();
  });

  it("redirects to registration when OTP request reports missing user", async () => {
    const onLogin = vi.fn();
    const onShowRegister = vi.fn();

    apiClientMock.mockRejectedValue(new Error("User not found"));

    render(<LoginScreen onLogin={onLogin} onShowRegister={onShowRegister} />);

    fireEvent.change(screen.getByTestId("country-select"), {
      target: { value: "US" },
    });
    fireEvent.change(screen.getByLabelText(/Phone number/), {
      target: { value: "5551234567" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );

    await waitFor(() => {
      expect(onShowRegister).toHaveBeenCalledTimes(1);
    });

    expect(onLogin).not.toHaveBeenCalled();
    expect(
      screen.queryByText("Enter verification code"),
    ).not.toBeInTheDocument();
    expect(toastMock.info).toHaveBeenCalledWith(
      "No account found for that number. Let's create one!",
    );
  });
});
