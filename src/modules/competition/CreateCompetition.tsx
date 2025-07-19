import CompetitionForm from "./CompetitionForm";

interface CreateCompetitionProps {
  onSuccess?: () => void;
  className?: string;
}

const CreateCompetition = ({ onSuccess, className }: CreateCompetitionProps) => {
  return (
    <CompetitionForm 
      mode="create" 
      onSuccess={onSuccess}
      className={className}
    />
  );
};

export default CreateCompetition;