import { useSelector, useDispatch } from "react-redux";
import { CheckCircle, XCircle, X } from "lucide-react";
import { removeMessage } from "../slice/messageSlice";

function MessageToast() {
  const messages = useSelector(state => state.message);
  const dispatch = useDispatch();

  return (
    <div className="toast-container position-fixed top-0 end-0 p-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message-toast message-toast--${message.type}`}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          {message.type === 'success'
            ? <CheckCircle size={18} className="message-toast__icon" />
            : <XCircle size={18} className="message-toast__icon" />
          }
          <span className="message-toast__text">{message.text}</span>
          <button
            type="button"
            className="message-toast__close"
            onClick={() => dispatch(removeMessage(message.id))}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default MessageToast;
