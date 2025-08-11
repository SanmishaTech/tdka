import TalukaForm from "./TalukaForm";

interface CreateTalukaProps {
  onSuccess?: () => void;
  className?: string;
}

const CreateTaluka = ({ onSuccess, className }: CreateTalukaProps) => {
  return (
    <TalukaForm 
      mode="create" 
      onSuccess={onSuccess}
      className={className}
    />
  );
};

export default CreateTaluka;
