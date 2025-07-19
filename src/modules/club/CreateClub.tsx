
import ClubForm from "./ClubForm";

interface CreateClubProps {
  onSuccess?: () => void;
  className?: string;
}

const CreateClub = ({ onSuccess, className }: CreateClubProps) => {
  return (
    <ClubForm 
      mode="create" 
      onSuccess={onSuccess}
      className={className}
    />
  );
};

export default CreateClub;
