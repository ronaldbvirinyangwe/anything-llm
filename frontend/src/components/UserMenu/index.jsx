import UserButton from "./UserButton";
import SchoolVerificationPrompt from "../SchoolVerificationPrompt";

const schoolVerificationEnabled =
  import.meta.env.VITE_ENABLE_SCHOOL_VERIFICATION === "true";

export default function UserMenu({ children }) {
  return (
    <div className="w-auto h-auto">
      <UserButton />
      {schoolVerificationEnabled && <SchoolVerificationPrompt />}
      {children}
    </div>
  );
}
