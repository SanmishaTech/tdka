import GroupForm from "./GroupForm";

interface EditGroupProps {
  groupId: string;
  onSuccess?: () => void;
  className?: string;
}

const EditGroup = ({ groupId, onSuccess, className }: EditGroupProps) => {
  return (
    <GroupForm 
      mode="edit" 
      groupId={groupId}
      onSuccess={onSuccess}
      className={className}
    />
  );
};

export default EditGroup;