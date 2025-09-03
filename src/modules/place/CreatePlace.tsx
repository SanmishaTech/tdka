import PlaceForm from "./PlaceForm";

interface CreatePlaceProps {
  onSuccess?: () => void;
  className?: string;
}

const CreatePlace = ({ onSuccess, className }: CreatePlaceProps) => {
  return (
    <PlaceForm 
      mode="create" 
      onSuccess={onSuccess}
      className={className}
    />
  );
};

export default CreatePlace;
