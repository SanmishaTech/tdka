import RegionForm from "./RegionForm";

interface CreateRegionProps {
  onSuccess?: () => void;
  className?: string;
}

const CreateRegion = ({ onSuccess, className }: CreateRegionProps) => {
  return (
    <RegionForm 
      mode="create" 
      onSuccess={onSuccess}
      className={className}
    />
  );
};

export default CreateRegion;
