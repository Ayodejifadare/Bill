import { useState } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Loader2 } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { useUserProfile } from "./UserProfileContext";
import { normalizePhoneNumber } from "../utils/phone";
import { toast } from "sonner";
import { authService } from "../services/auth";
import { Separator } from "./ui/separator";

interface RegisterScreenProps {
  onRegister: (data: any) => Promise<void> | void;
  onShowLogin: () => void;
  onSocialLogin: (data: any) => void;
  googleEnabled?: boolean;
}

// Flag components
const NigeriaFlag = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" className="rounded-sm">
    <rect width="16" height="4" fill="#008751" />
    <rect y="4" width="16" height="4" fill="#ffffff" />
    <rect y="8" width="16" height="4" fill="#008751" />
  </svg>
);

const USFlag = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" className="rounded-sm">
    <rect width="16" height="12" fill="#B22234" />
    <rect y="1" width="16" height="1" fill="#ffffff" />
    <rect y="3" width="16" height="1" fill="#ffffff" />
    <rect y="5" width="16" height="1" fill="#ffffff" />
    <rect y="7" width="16" height="1" fill="#ffffff" />
    <rect y="9" width="16" height="1" fill="#ffffff" />
    <rect y="11" width="16" height="1" fill="#ffffff" />
    <rect width="6" height="6" fill="#3C3B6E" />
  </svg>
);

const UKFlag = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" className="rounded-sm">
    <rect width="16" height="12" fill="#012169" />
    <path d="M0 0l16 12M16 0L0 12" stroke="#ffffff" strokeWidth="1" />
    <path d="M8 0v12M0 6h16" stroke="#ffffff" strokeWidth="2" />
    <path d="M8 0v12M0 6h16" stroke="#C8102E" strokeWidth="1" />
  </svg>
);

const CanadaFlag = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" className="rounded-sm">
    <rect width="5" height="12" fill="#FF0000" />
    <rect x="5" width="6" height="12" fill="#ffffff" />
    <rect x="11" width="5" height="12" fill="#FF0000" />
    <path
      d="M8 2l1 2h2l-1.5 1.5L10 8l-2-1.5L6 8l0.5-1.5L5 5h2z"
      fill="#FF0000"
    />
  </svg>
);

const countryOptions = [
  {
    code: "NG",
    name: "Nigeria",
    flag: <NigeriaFlag />,
    phonePrefix: "+234",
    region: "NG" as const,
    currency: "NGN" as const,
  },
  {
    code: "US",
    name: "United States",
    flag: <USFlag />,
    phonePrefix: "+1",
    region: "US" as const,
    currency: "USD" as const,
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: <UKFlag />,
    phonePrefix: "+44",
    region: "GB" as const,
    currency: "GBP" as const,
  },
  {
    code: "CA",
    name: "Canada",
    flag: <CanadaFlag />,
    phonePrefix: "+1",
    region: "CA" as const,
    currency: "CAD" as const,
  },
];

export function RegisterScreen({
  onRegister,
  onShowLogin,
  onSocialLogin,
  googleEnabled = true,
}: RegisterScreenProps) {
  const { updateAppSettings, updateUserProfile } = useUserProfile();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    country: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearErrorsFor = (keys: string[] = []) => {
    setErrors((prev) => {
      const updatedErrors = { ...prev };

      if (updatedErrors.api) {
        delete updatedErrors.api;
      }

      keys.forEach((key) => {
        if (updatedErrors[key]) {
          delete updatedErrors[key];
        }
      });

      return updatedErrors;
    });
  };

  const selectedCountry = countryOptions.find(
    (c) => c.code === formData.country,
  );
  const exampleLocalNumber =
    selectedCountry?.code === "NG"
      ? "8012345678"
      : selectedCountry?.code === "GB"
        ? "7123456789"
        : "5551234567";

  const formatPhone = () =>
    normalizePhoneNumber(formData.phone, selectedCountry?.phonePrefix);

  const googleLogin = useGoogleLogin({
    flow: "auth-code",
    scope: "openid profile email",
    onSuccess: async (codeResponse) => {
      if (!codeResponse?.code) {
        toast.error("Google sign-in did not return a valid code.");
        setIsGoogleLoading(false);
        return;
      }

      try {
        const result = await authService.loginWithGoogle({
          code: codeResponse.code,
          region: selectedCountry?.region,
          currency: selectedCountry?.currency,
        });

        if (!result.success || !result.token || !result.user) {
          toast.error(result.error || "Google sign-in failed. Please try again.");
          return;
        }

        if (selectedCountry) {
          updateAppSettings({
            region: selectedCountry.region,
            currency: selectedCountry.currency,
          });
        } else if (result.user?.region && result.user?.currency) {
          updateAppSettings({
            region: result.user.region,
            currency: result.user.currency,
          });
        }

        clearErrorsFor();
        onSocialLogin(result);
      } catch (error) {
        console.error("Google sign-up error:", error);
        toast.error("Google sign-in failed. Please try again.");
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.error("Google sign-up popup error:", errorResponse);
      toast.error("Google sign-in was cancelled or failed.");
      setIsGoogleLoading(false);
    },
  });

  const handleGoogleSignup = () => {
    if (!googleEnabled) {
      toast.error("Google sign-in is not available in this environment.");
      return;
    }
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    googleLogin();
  };

  const googleButtonDisabled = !googleEnabled || isGoogleLoading;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Email is invalid";
    if (!formData.country) newErrors.country = "Please select your country";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    else {
      const formatted = formatPhone();
      if (!/^\+?[1-9]\d{7,14}$/.test(formatted)) {
        newErrors.phone = "Enter a valid phone number in international format";
      }
    }
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!acceptTerms)
      newErrors.terms = "You must accept the terms and conditions";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    clearErrorsFor();

    if (!validateForm()) return;

    setIsLoading(true);

    // Set user region based on selected country
    if (selectedCountry) {
      updateAppSettings({
        region: selectedCountry.region,
        currency: selectedCountry.currency,
      });

      updateUserProfile({
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
      });
    }

    try {
      await onRegister({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formatPhone(),
        password: formData.password,
        country: formData.country,
        acceptMarketing,
      });
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        api: error.message || "Registration failed",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearErrorsFor([field]);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-purple-50">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowLogin}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-2xl">Create Account</h1>
            <p className="text-muted-foreground">Join SplitPay today</p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Registration Form */}
        <Card className="p-6">
          {errors.api && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {errors.api}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="firstName" className="text-sm">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) =>
                      updateFormData("firstName", e.target.value)
                    }
                    className="pl-10"
                  />
                </div>
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="lastName" className="text-sm">
                  Last Name
                </label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => updateFormData("lastName", e.target.value)}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Country and Phone Number */}
            <div className="grid grid-cols-3 gap-4">
              {/* Country */}
              <div className="space-y-1">
                <label htmlFor="country" className="text-sm font-medium">
                  Country
                </label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => updateFormData("country", value)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select country">
                      {selectedCountry && (
                        <div className="flex items-center space-x-2">
                          {selectedCountry.flag}
                          <span className="text-sm">
                            {selectedCountry.phonePrefix}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <div className="flex items-center space-x-2">
                          {country.flag}
                          <span>{country.name}</span>
                          <span className="text-muted-foreground text-sm">
                            ({country.phonePrefix})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && (
                  <p className="text-xs text-destructive">{errors.country}</p>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-1 col-span-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  Phone number <span className="text-red-500">*</span>
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={
                    selectedCountry
                      ? `e.g. ${exampleLocalNumber} or ${selectedCountry.phonePrefix}${exampleLocalNumber}`
                      : "e.g. +15551234567"
                  }
                  value={formData.phone}
                  onChange={(e) => updateFormData("phone", e.target.value)}
                  className="h-10"
                />
                {selectedCountry && (
                  <p className="text-xs text-muted-foreground">
                    Enter your number with or without the country code.
                    Examples: {exampleLocalNumber},{" "}
                    {selectedCountry.phonePrefix}
                    {exampleLocalNumber}
                  </p>
                )}
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone}</p>
                )}
              </div>
            </div>

            {selectedCountry && (
              <p className="text-xs text-muted-foreground">
                Your region will be set to{" "}
                {selectedCountry.region === "NG" ? "Nigeria" : "International"}{" "}
                based on this selection
              </p>
            )}

            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="password" className="text-sm">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => updateFormData("password", e.target.value)}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-sm">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    updateFormData("confirmPassword", e.target.value)
                  }
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => {
                    const isChecked = checked as boolean;
                    setAcceptTerms(isChecked);
                    clearErrorsFor(["terms"]);
                  }}
                />
                <label htmlFor="terms" className="text-sm leading-5">
                  I agree to the{" "}
                  <Button variant="link" className="p-0 h-auto text-sm">
                    Terms of Service
                  </Button>{" "}
                  and{" "}
                  <Button variant="link" className="p-0 h-auto text-sm">
                    Privacy Policy
                  </Button>
                </label>
              </div>
              {errors.terms && (
                <p className="text-xs text-destructive">{errors.terms}</p>
              )}

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="marketing"
                  checked={acceptMarketing}
                  onCheckedChange={(checked) => {
                    setAcceptMarketing(checked as boolean);
                    clearErrorsFor();
                  }}
                />
                <label htmlFor="marketing" className="text-sm leading-5">
                  I'd like to receive marketing updates and promotions
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full h-12" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          {/* Alternative Sign Up Methods */}
          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl"
              onClick={handleGoogleSignup}
              disabled={googleButtonDisabled}
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </>
              )}
            </Button>
            {!googleEnabled && (
              <p className="text-xs text-muted-foreground text-center">
                Google sign-in is not available in this environment.
              </p>
            )}
          </div>
        </Card>

        {/* Login Link */}
        <div className="text-center">
          <p className="text-muted-foreground">
            Already have an account?{" "}
            <Button variant="link" className="p-0 h-auto" onClick={onShowLogin}>
              Sign in
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
