import { useParams, useNavigate } from "react-router-dom";
import CompetitionForm from "./CompetitionForm";

interface EditCompetitionProps {
  competitionId?: string;
  onSuccess?: () => void;
  className?: string;
}

const EditCompetition = ({ competitionId: propCompetitionId, onSuccess, className }: EditCompetitionProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Use competitionId from props if provided (for dialog usage), otherwise from URL params (for route usage)
  const competitionId = propCompetitionId || id;
  
  if (!competitionId) {
    return <div>Competition ID not found</div>;
  }
  
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      // If used as a route, navigate back to competitions list
      navigate('/competitions');
    }
  };
  
  return (
    <CompetitionForm 
      mode="edit" 
      competitionId={competitionId}
      onSuccess={handleSuccess}
      className={className}
    />
  );
};

export default EditCompetition;