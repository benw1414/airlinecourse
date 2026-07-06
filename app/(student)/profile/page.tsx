import { requireProfile } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditProfileForm } from "./edit-profile-form";

export default async function ProfilePage() {
  const profile = await requireProfile();

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>My profile</CardTitle>
        </CardHeader>
        <CardContent>
          <EditProfileForm
            firstName={profile.first_name}
            lastName={profile.last_name}
            nickname={profile.nickname}
            studentNumber={profile.student_number}
            groupName={profile.group_name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
