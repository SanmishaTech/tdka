import PlayerForm from "./PlayerForm";

interface EditPlayerProps {
  playerId: string;
  onSuccess?: () => void;
  className?: string;
}

const EditPlayer = ({ playerId, onSuccess, className }: EditPlayerProps) => {
  return (
    <PlayerForm 
      mode="edit" 
      playerId={playerId}
      onSuccess={onSuccess}
      className={className}
    />
  );
};

export default EditPlayer;