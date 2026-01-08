import { useParams, useNavigate } from "react-router-dom";
import RefereeForm from "./RefereeForm";

interface EditRefereeProps {
  refereeId?: string;
  onSuccess?: () => void;
  className?: string;
}

const EditReferee = ({ refereeId: propRefereeId, onSuccess, className }: EditRefereeProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const refereeId = propRefereeId || id;

  if (!refereeId) {
    return <div>Referee ID not found</div>;
  }

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      navigate("/referees");
    }
  };

  return (
    <RefereeForm
      mode="edit"
      refereeId={refereeId}
      onSuccess={handleSuccess}
      className={className}
    />
  );
};

export default EditReferee;
