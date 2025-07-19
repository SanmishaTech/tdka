import GroupForm from "./GroupForm";

interface CreateGroupProps {
  onSuccess?: () => void;
  className?: string;
}

const CreateGroup = ({ onSuccess, className }: CreateGroupProps) => {
  return (
    <GroupForm 
      mode="create" 
      onSuccess={onSuccess}
      className={className}
    />
  );
};

export default CreateGroup;