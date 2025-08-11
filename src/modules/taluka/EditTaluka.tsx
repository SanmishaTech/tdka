import { useParams, useNavigate } from "react-router-dom";
import TalukaForm from "./TalukaForm";

interface EditTalukaProps {
  talukaId?: string;
  onSuccess?: () => void;
  className?: string;
}

const EditTaluka = ({ talukaId: propTalukaId, onSuccess, className }: EditTalukaProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Use talukaId from props if provided (for dialog usage), otherwise from URL params (for route usage)
  const talukaId = propTalukaId || id;
  
  if (!talukaId) {
    return <div>Taluka ID not found</div>;
  }
  
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      // If used as a route, navigate back to talukas list
      navigate('/talukas');
    }
  };
  
  return (
    <TalukaForm 
      mode="edit" 
      talukaId={talukaId}
      onSuccess={handleSuccess}
      className={className}
    />
  );
};

export default EditTaluka;
