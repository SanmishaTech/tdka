import { useParams } from "react-router-dom";
import RegionForm from "./RegionForm";

interface EditRegionProps {
  regionId?: string;
  onSuccess?: () => void;
  className?: string;
}

const EditRegion = ({ regionId: propRegionId, onSuccess, className }: EditRegionProps) => {
  const { id } = useParams<{ id: string }>();
  const regionId = propRegionId || id;

  if (!regionId) {
    return <div>Region ID not found</div>;
  }

  return (
    <RegionForm 
      mode="edit"
      regionId={regionId} 
      onSuccess={onSuccess}
      className={className}
    />
  );
};

export default EditRegion;
