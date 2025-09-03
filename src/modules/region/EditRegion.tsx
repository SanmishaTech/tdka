import { useParams, useNavigate } from "react-router-dom";
import RegionForm from "./RegionForm";

interface EditRegionProps {
  regionId?: string;
  onSuccess?: () => void;
  className?: string;
}

const EditRegion = ({ regionId: propRegionId, onSuccess, className }: EditRegionProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Use regionId from props if provided (for dialog usage), otherwise from URL params (for route usage)
  const regionId = propRegionId || id;
  
  if (!regionId) {
    return <div>Region ID not found</div>;
  }
  
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      // If used as a route, navigate back to regions list
      navigate('/regions');
    }
  };
  
  return (
    <RegionForm 
      mode="edit" 
      regionId={regionId}
      onSuccess={handleSuccess}
      className={className}
    />
  );
};

export default EditRegion;
