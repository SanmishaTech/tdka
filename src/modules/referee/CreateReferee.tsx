import RefereeForm from "./RefereeForm";

interface CreateRefereeProps {
  onSuccess?: () => void;
  className?: string;
}

const CreateReferee = ({ onSuccess, className }: CreateRefereeProps) => {
  return (
    <RefereeForm mode="create" onSuccess={onSuccess} className={className} />
  );
};

export default CreateReferee;
