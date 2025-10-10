import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { RegisterScreen } from "./RegisterScreen";
import { useUserProfile } from "./UserProfileContext";

vi.mock("./UserProfileContext", () => ({
  useUserProfile: vi.fn(),
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

vi.mock("./ui/checkbox", () => ({
  Checkbox: ({ id, checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      data-testid={id}
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

describe("RegisterScreen country selection", () => {
  const useUserProfileMock = vi.mocked(useUserProfile);
  const updateAppSettings = vi.fn();
  const updateUserProfile = vi.fn();

  beforeEach(() => {
    updateAppSettings.mockReset();
    updateUserProfile.mockReset().mockResolvedValue(undefined);
    useUserProfileMock.mockReset().mockReturnValue({
      updateAppSettings,
      updateUserProfile,
    });
  });

  it.each([
    ["GB", "GBP"],
    ["CA", "CAD"],
  ])(
    "sends %s region and %s currency to updateAppSettings",
    async (code, currency) => {
      const onRegister = vi.fn().mockResolvedValue(undefined);

      render(<RegisterScreen onRegister={onRegister} onShowLogin={vi.fn()} />);

      fireEvent.change(screen.getByLabelText("First Name"), {
        target: { value: "Alice" },
      });
      fireEvent.change(screen.getByLabelText("Last Name"), {
        target: { value: "Smith" },
      });
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "alice@example.com" },
      });

      fireEvent.change(screen.getByTestId("country-select"), {
        target: { value: code },
      });

      fireEvent.change(screen.getByLabelText(/Phone number/), {
        target: { value: "7123456789" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByLabelText("Confirm Password"), {
        target: { value: "password123" },
      });

      fireEvent.click(screen.getByTestId("terms"));

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(updateAppSettings).toHaveBeenCalledWith({
          region: code,
          currency,
        });
      });

      expect(onRegister).toHaveBeenCalled();
    },
  );
});
