import { useState, useEffect, useRef, useImperativeHandle } from "react";
import { Plus } from "lucide-react";
import * as bootstrap from "bootstrap";
import { twPhoneValidation, phonePattern } from "@utils/validation";

function RecipientSelectorContent({
  variant,
  commonRecipients,
  showAddRecipientForm,
  addRecipientDraft,
  addRecipientNameError,
  addRecipientTelError,
  addRecipientAddressError,
  selectedRecipientId,
  onOpenAddForm,
  onPendingRecipient,
  onDeleteRecipient,
  onDraftNameChange,
  onDraftTelChange,
  onDraftAddressChange,
}) {
  const isModal = variant === "modal";
  return (
    <>
      <div className="d-flex">
        <h2 className={`${isModal ? "h6" : "text-p-24"} flex-grow-1`}>選擇常用收件人</h2>
        <button
          className={isModal ? "btn btn-underline" : "btn border-0 p-3"}
          type="button"
          onClick={onOpenAddForm}
        >
          {isModal ? "新增常用收件人" : <Plus size={24} strokeWidth={2.5} className="text-secondary-700" />}
        </button>
      </div>
      {commonRecipients.length > 0 ? (
        commonRecipients.map((recipient, index) => (
          <div
            key={recipient.id}
            className={`form-check d-flex align-items-center${
              isModal
                ? index !== commonRecipients.length - 1 ? " mb-4" : ""
                : " mb-3"
            }`}
          >
            <input
              className="form-check-input me-2"
              type="radio"
              name={`${variant}-commonRecipient`}
              id={`${variant}-recipient-${recipient.id}`}
              checked={selectedRecipientId === recipient.id}
              onChange={() => onPendingRecipient(recipient)}
            />
            <label className="form-check-label me-2" htmlFor={`${variant}-recipient-${recipient.id}`}>
              {recipient.name} {recipient.tel}
            </label>
            <button
              type="button"
              className="btn btn-link p-0"
              onClick={() => onDeleteRecipient(recipient.id)}
            >
              刪除
            </button>
          </div>
        ))
      ) : (
        <p>尚無常用收件人</p>
      )}
      {showAddRecipientForm && (
        <div className="rounded-4 p-5 mt-4 mb-8 mb-lg-0 bg-gray-100">
          <div className="mb-3 mb-lg-6">
            <label className="fw-bold mb-1">收件人</label>
            <input
              type="text"
              name="name"
              className={`form-control${addRecipientNameError ? " is-invalid" : ""}`}
              value={addRecipientDraft.name || ""}
              onChange={onDraftNameChange}
              placeholder="請輸入收件人姓名"
            />
            {addRecipientNameError && <div className="invalid-feedback">{addRecipientNameError}</div>}
          </div>
          <div className="mb-3 mb-lg-6">
            <label className="fw-bold mb-1">手機號碼</label>
            <input
              type="text"
              name="tel"
              className={`form-control${addRecipientTelError ? " is-invalid" : ""}`}
              value={addRecipientDraft.tel || ""}
              // 輸入時清除錯誤，避免打字途中一直顯示紅字；格式驗證留到按「確定」才觸發
              onChange={onDraftTelChange}
              placeholder="請輸入手機號碼"
            />
            {addRecipientTelError && <div className="invalid-feedback">{addRecipientTelError}</div>}
          </div>
          <div className="mb-3 mb-lg-6">
            <label className="fw-bold mb-1">收件地址</label>
            <input
              type="text"
              name="address"
              className={`form-control${addRecipientAddressError ? " is-invalid" : ""}`}
              value={addRecipientDraft.address || ""}
              onChange={onDraftAddressChange}
              placeholder="請輸入收件地址"
            />
            {addRecipientAddressError && <div className="invalid-feedback">{addRecipientAddressError}</div>}
          </div>
          <p className="text-muted small mb-0">確認後，會將此資料新增至常用收件人</p>
        </div>
      )}
    </>
  );
}

function RecipientPicker({ onConfirm, ref }) {
  // 設定常用收件人資訊，這裡先寫死三筆資料
  const [commonRecipients, setCommonRecipients] = useState([
    { id: 1, name: "林小魚", tel: "0910552225", address: "台北市信義區信義路五段7號" },
    { id: 2, name: "林鮭魚", tel: "0921628826", address: "台北市大安區和平東路三段12號" },
    { id: 3, name: "林葦辰", tel: "0919104401", address: "台北市中正區忠孝東路一段1號" },
  ]);
  const [addRecipientDraft, setAddRecipientDraft] = useState({ name: "", tel: "", address: "" });
  const [showAddRecipientForm, setShowAddRecipientForm] = useState(false);
  const [addRecipientNameError, setAddRecipientNameError] = useState("");
  const [addRecipientTelError, setAddRecipientTelError] = useState("");
  const [addRecipientAddressError, setAddRecipientAddressError] = useState("");
  // Radio 選取後暫存，按「確定」才透過 onConfirm 寫入主表單
  const [pendingRecipient, setPendingRecipient] = useState(null);
  // 上次按「確定」確認的收件人 id，重開 Modal/Offcanvas 時用於恢復選取狀態
  const [confirmedRecipientId, setConfirmedRecipientId] = useState(null);

  const modalDomRef = useRef(null);
  const offcanvasDomRef = useRef(null);
  const modalRef = useRef(null);
  const offcanvasRef = useRef(null);

  useImperativeHandle(ref, () => ({
    openModal: () => modalRef.current?.show(),
    openOffcanvas: () => offcanvasRef.current?.show(),
  }));

  const updateRecipientData = (e) => {
    const { name, value } = e.target;
    setAddRecipientDraft(prev => ({ ...prev, [name]: value }));
  };

  const closeModal = () => { if (modalRef.current) modalRef.current.hide(); };
  const closeOffcanvas = () => { if (offcanvasRef.current) offcanvasRef.current.hide(); };

  const handleOpenAddForm = () => {
    setShowAddRecipientForm(true);
    setAddRecipientDraft({ name: "", tel: "", address: "" });
    setAddRecipientNameError("");
    setAddRecipientTelError("");
    setAddRecipientAddressError("");
    setPendingRecipient(null);
  };

  const handlePendingRecipient = (recipient) => {
    setPendingRecipient(recipient);
    setShowAddRecipientForm(false);
  };

  const handleAddRecipient = () => {
    const nameInvalid = !addRecipientDraft.name;
    const telInvalid = !phonePattern.test(addRecipientDraft.tel);
    const addressInvalid = !addRecipientDraft.address;
    if (nameInvalid) setAddRecipientNameError("請輸入收件人姓名");
    if (telInvalid) setAddRecipientTelError(twPhoneValidation.pattern.message);
    if (addressInvalid) setAddRecipientAddressError("請輸入收件地址");
    if (nameInvalid || telInvalid || addressInvalid) return null;
    const newRecipient = { id: commonRecipients.length + 1, ...addRecipientDraft };
    setCommonRecipients(prev => [...prev, newRecipient]);
    onConfirm(newRecipient);
    setAddRecipientNameError("");
    setAddRecipientTelError("");
    setAddRecipientAddressError("");
    return newRecipient;
  };

  const handleDraftNameChange = (e) => { updateRecipientData(e); setAddRecipientNameError(""); };
  const handleDraftTelChange = (e) => { updateRecipientData(e); setAddRecipientTelError(""); };
  const handleDraftAddressChange = (e) => { updateRecipientData(e); setAddRecipientAddressError(""); };

  const deleteCommonRecipient = (id) => {
    setCommonRecipients(prev => prev.filter(recipient => recipient.id !== id));
  };

  useEffect(() => {
    modalRef.current = new bootstrap.Modal(modalDomRef.current);
    offcanvasRef.current = new bootstrap.Offcanvas(offcanvasDomRef.current);

    // Modal 關閉時移除焦點
    modalDomRef.current.addEventListener("hide.bs.modal", () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });

    // Modal/Offcanvas 完全關閉後重設新增表單狀態（含 backdrop 點擊）
    const resetAddForm = () => {
      setShowAddRecipientForm(false);
      setAddRecipientDraft({ name: "", tel: "", address: "" });
      setAddRecipientNameError("");
      setAddRecipientTelError("");
      setAddRecipientAddressError("");
      setPendingRecipient(null);
    };
    modalDomRef.current.addEventListener("hidden.bs.modal", resetAddForm);
    offcanvasDomRef.current.addEventListener("hidden.bs.offcanvas", resetAddForm);
  }, []);

  return (
    <>
      {/* 電腦版 Modal */}
      <div className="modal" id="recipientModal" ref={modalDomRef}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body p-10 pb-6">
              <RecipientSelectorContent
                variant="modal"
                commonRecipients={commonRecipients}
                showAddRecipientForm={showAddRecipientForm}
                selectedRecipientId={pendingRecipient?.id ?? (showAddRecipientForm ? null : confirmedRecipientId)}
                addRecipientDraft={addRecipientDraft}
                addRecipientNameError={addRecipientNameError}
                addRecipientTelError={addRecipientTelError}
                addRecipientAddressError={addRecipientAddressError}
                onOpenAddForm={handleOpenAddForm}
                onPendingRecipient={handlePendingRecipient}
                onDeleteRecipient={deleteCommonRecipient}
                onDraftNameChange={handleDraftNameChange}
                onDraftTelChange={handleDraftTelChange}
                onDraftAddressChange={handleDraftAddressChange}
              />
            </div>
            <div className="d-flex flex-row gap-2 p-10 pt-0">
              <button type="button" className="btn btn-dora-outline flex-fill" data-bs-dismiss="modal" onClick={closeModal}>取消</button>
              <button
                type="button"
                className="btn btn-dora flex-fill"
                onClick={() => {
                  if (showAddRecipientForm) {
                    const saved = handleAddRecipient();
                    if (!saved) return;
                    setConfirmedRecipientId(saved.id);
                  } else if (pendingRecipient) {
                    onConfirm(pendingRecipient);
                    setConfirmedRecipientId(pendingRecipient.id);
                  }
                  setShowAddRecipientForm(false);
                  closeModal();
                }}
              >
                確定
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* 手機版 Offcanvas */}
      <div className="offcanvas offcanvas-bottom custom-offcanvas-80" id="recipientOffcanvas" ref={offcanvasDomRef}>
        <div className="offcanvas-body p-0">
          <RecipientSelectorContent
            variant="offcanvas"
            commonRecipients={commonRecipients}
            showAddRecipientForm={showAddRecipientForm}
            selectedRecipientId={pendingRecipient?.id ?? (showAddRecipientForm ? null : confirmedRecipientId)}
            addRecipientDraft={addRecipientDraft}
            addRecipientNameError={addRecipientNameError}
            addRecipientTelError={addRecipientTelError}
            addRecipientAddressError={addRecipientAddressError}
            onOpenAddForm={handleOpenAddForm}
            onPendingRecipient={setPendingRecipient}
            onDeleteRecipient={deleteCommonRecipient}
            onDraftNameChange={handleDraftNameChange}
            onDraftTelChange={handleDraftTelChange}
            onDraftAddressChange={handleDraftAddressChange}
          />
        </div>
        <div className="offcanvas-footer d-flex justify-content-between p-3">
          <button type="button" className="btn btn-dora-outline w-50 me-2" onClick={closeOffcanvas}>取消</button>
          <button type="button" className="btn btn-dora w-50" onClick={() => {
            if (showAddRecipientForm) {
              const saved = handleAddRecipient();
              if (!saved) return;
              setConfirmedRecipientId(saved.id);
            } else if (pendingRecipient) {
              onConfirm(pendingRecipient);
              setConfirmedRecipientId(pendingRecipient.id);
            }
            setShowAddRecipientForm(false);
            closeOffcanvas();
          }}>確定</button>
        </div>
      </div>
    </>
  );
}

export default RecipientPicker;
