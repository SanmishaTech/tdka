import CompetitionForm from "./CompetitionForm";

interface EditCompetitionProps {
  competitionId: string;
  onSuccess?: () => void;
  className?: string;
}

const EditCompetition = ({ competitionId, onSuccess, className }: EditCompetitionProps) => {
  return (
    <CompetitionForm 
      mode="edit" 
      competitionId={competitionId}
      onSuccess={onSuccess}
      className={className}
    />
  );
};

export default EditCompetition;