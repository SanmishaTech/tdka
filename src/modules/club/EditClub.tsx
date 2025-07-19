
import ClubForm from "./ClubForm";

interface EditClubProps {
  clubId: string;
  onSuccess?: () => void;
  className?: string;
}

const EditClub = ({ clubId, onSuccess, className }: EditClubProps) => {
  return (
    <ClubForm 
      mode="edit" 
      clubId={clubId}
      onSuccess={onSuccess}
      className={className}
    />
  );
};

export default EditClub;
