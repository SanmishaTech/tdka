import { useParams, useNavigate } from "react-router-dom";
import ClubForm from "./ClubForm";

interface EditClubProps {
  clubId?: string;
  onSuccess?: () => void;
  className?: string;
}

const EditClub = ({ clubId: propClubId, onSuccess, className }: EditClubProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Use clubId from props if provided (for dialog usage), otherwise from URL params (for route usage)
  const clubId = propClubId || id;
  
  if (!clubId) {
    return <div>Club ID not found</div>;
  }
  
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      // If used as a route, navigate back to clubs list
      navigate('/clubs');
    }
  };
  
  return (
    <ClubForm 
      mode="edit" 
      clubId={clubId}
      onSuccess={handleSuccess}
      className={className}
    />
  );
};

export default EditClub;
