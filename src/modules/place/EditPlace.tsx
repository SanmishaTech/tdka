import { useParams } from "react-router-dom";
import PlaceForm from "./PlaceForm";

interface EditPlaceProps {
  placeId?: string;
  onSuccess?: () => void;
  className?: string;
}

const EditPlace = ({ placeId: propPlaceId, onSuccess, className }: EditPlaceProps) => {
  const { id } = useParams<{ id: string }>();
  const placeId = propPlaceId || id;

  if (!placeId) {
    return <div>Place ID not found</div>;
  }

  return (
    <PlaceForm 
      mode="edit"
      placeId={placeId} 
      onSuccess={onSuccess}
      className={className}
    />
  );
};

export default EditPlace;
