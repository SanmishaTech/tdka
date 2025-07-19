import PlayerForm from "./PlayerForm";

interface CreatePlayerProps {
  onSuccess?: () => void;
  className?: string;
}

const CreatePlayer = ({ onSuccess, className }: CreatePlayerProps) => {
  return (
    <PlayerForm 
      mode="create" 
      onSuccess={onSuccess}
      className={className}
    />
  );
};

export default CreatePlayer;