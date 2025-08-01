import { useParams, useNavigate } from "react-router-dom";
import PlayerForm from "./PlayerForm";

interface EditPlayerProps {
  playerId?: string;
  onSuccess?: () => void;
  className?: string;
}

const EditPlayer = ({ playerId: propPlayerId, onSuccess, className }: EditPlayerProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Use playerId from props if provided (for dialog usage), otherwise from URL params (for route usage)
  const playerId = propPlayerId || id;
  
  if (!playerId) {
    return <div>Player ID not found</div>;
  }
  
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      // If used as a route, navigate back to players list
      navigate('/players');
    }
  };
  
  return (
    <PlayerForm 
      mode="edit" 
      playerId={playerId}
      onSuccess={handleSuccess}
      className={className}
    />
  );
};

export default EditPlayer;