import { useEffect, useState } from 'react';
import ConfirmationModal from './ConfirmationModal';
import styles from '@/styles/admin/agendamentos/appointmentDetails.module.css';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { firestore } from '@/firebase/firebaseConfig';
import { buscarConvenios } from '@/functions/conveniosFunctions';
import { buscarProcedimentos, ProcedimentoData, atualizarProcedimento } from '@/functions/procedimentosFunctions';
import { buscarMedicos } from '@/functions/medicosFunctions';
import { format as formatDateFns, parse as parseDateFns } from 'date-fns';
import { statusAgendamento, excluirAgendamento } from '@/functions/agendamentosFunction';
import { criarNotificacao } from '@/functions/notificacoesFunctions';

interface Appointment {
  id: string;
  data: string;
  hora: string;
  profissional: string;
  nomePaciente: string;
  detalhes: string;
  motivo?: string;
  usuarioId: string;
  inicioAtendimento?: string;
  duracaoAtendimento?: number;
  fimAtendimento?: string;
  convenio?: string;
  procedimento?: string;
  especialidade?: string;
  status: string;
}

interface UserData {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
}

interface Props {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (id: string) => void;
  readOnly?: boolean;
}

const AppointmentDetailsModal = ({ appointment, isOpen, onClose, onComplete, readOnly = false }: Props) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [convenios, setConvenios] = useState<{ id: string; nome: string }[]>([]);
  const [procedimentos, setProcedimentos] = useState<(ProcedimentoData & { id: string })[]>([]);
  const [medicos, setMedicos] = useState<{ id: string; nome: string }[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [billingValue, setBillingValue] = useState(0);
  const [saveDefault, setSaveDefault] = useState(false);

  const statusClassMap: Record<string, string> = {
    [statusAgendamento.AGENDADO]: styles.statusAgendado,
    [statusAgendamento.CONFIRMADO]: styles.statusConfirmado,
    [statusAgendamento.EM_ANDAMENTO]: styles.statusEmAndamento,
    [statusAgendamento.CANCELADO]: styles.statusCancelado,
    [statusAgendamento.CONCLUIDO]: styles.statusConcluido,
    [statusAgendamento.PENDENTE]: styles.statusPendente,
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (appointment?.usuarioId) {
        const ref = doc(firestore, 'users', appointment.usuarioId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setUserData({
            nome: data.nome || '',
            email: data.email || '',
            cpf: data.cpf || '',
            telefone: data.telefone || '',
          });
        }
      }
    };
    if (isOpen) {
      fetchUser();
    }
  }, [isOpen, appointment]);

  // Buscar convênios, procedimentos e médicos do sistema ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;
    const fetchAll = async () => {
      try {
        const [conv, procs, meds] = await Promise.all([
          buscarConvenios(),
          buscarProcedimentos(),
          buscarMedicos(),
        ]);
        setConvenios(conv);
        setProcedimentos(procs);
        setMedicos(meds);
      } catch {}
    };
    fetchAll();
  }, [isOpen]);

  useEffect(() => {
    setShowConfirmDelete(false);
  }, [appointment, isOpen]);


  // --- Cálculo de valores e nomes relacionados ao procedimento/convenio ---
  // Busca pelo id ou nome salvo no agendamento
  const convenioNome =
    convenios.find(c => c.id === appointment?.convenio)?.nome ||
    convenios.find(c => c.nome === appointment?.convenio)?.nome ||
    appointment?.convenio ||
    '-';
  const procedimentoSelecionado =
    procedimentos.find(
      p => p.id === appointment?.procedimento || p.nome === appointment?.procedimento
    );
  const procedimentoNome =
    procedimentoSelecionado?.nome ||
    appointment?.procedimento ||
    appointment?.especialidade ||
    '-';
  const convenioKey =
    convenioNome !== '-' ? convenioNome : appointment?.convenio;
  const valorProcedimento =
    procedimentoSelecionado &&
    convenioKey &&
    procedimentoSelecionado.valoresConvenio &&
    procedimentoSelecionado.valoresConvenio[convenioKey] !== undefined
      ? procedimentoSelecionado.valoresConvenio[convenioKey]
      : procedimentoSelecionado?.valor || 0;
  const hasDefaultValue =
    convenioKey &&
    procedimentoSelecionado?.valoresConvenio &&
    procedimentoSelecionado.valoresConvenio[convenioKey] !== undefined;
  const profissionalNome =
    medicos.find(m => m.id === appointment?.profissional)?.nome ||
    medicos.find(m => m.nome === appointment?.profissional)?.nome ||
    appointment?.profissional ||
    '-';

  useEffect(() => {
    if (showPaymentModal) {
      setBillingValue(valorProcedimento);
      setSaveDefault(false);
    }
  }, [showPaymentModal, valorProcedimento]);

  // Função para atualizar status do agendamento
  const handleStatusChange = async (newStatus: string) => {
    if (!appointment) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      const agendamentoRef = doc(firestore, 'agendamentos', appointment.id);
      if (newStatus === statusAgendamento.EM_ANDAMENTO) {
        const inicio = new Date().toISOString();
        await updateDoc(agendamentoRef, {
          status: newStatus,
          inicioAtendimento: inicio,
        });
        appointment.status = newStatus;
        appointment.inicioAtendimento = inicio;
      } else if (newStatus === statusAgendamento.CONCLUIDO) {
        const fim = new Date();
        let duracao = 0;
        if (appointment.inicioAtendimento) {
          const inicioDate = new Date(appointment.inicioAtendimento);
          duracao = Math.floor((fim.getTime() - inicioDate.getTime()) / 1000);
        }
        await updateDoc(agendamentoRef, {
          status: newStatus,
          fimAtendimento: fim.toISOString(),
          duracaoAtendimento: duracao,
        });
        appointment.status = newStatus;
        appointment.fimAtendimento = fim.toISOString();
        appointment.duracaoAtendimento = duracao;
      } else {
        await updateDoc(agendamentoRef, { status: newStatus });
        appointment.status = newStatus;
      }

      try {
        const pacienteRef = doc(firestore, 'pacientes', appointment.usuarioId);
        const pacienteSnap = await getDoc(pacienteRef);
        if (pacienteSnap.exists()) {
          const pacienteData = pacienteSnap.data();
          const ags: any[] = pacienteData.agendamentos || [];
          const idx = ags.findIndex(
            ag =>
              ag.data === appointment.data &&
              ag.hora === appointment.hora &&
              ag.profissional === appointment.profissional
          );
          if (idx > -1) {
            ags[idx].status = newStatus;
            if (newStatus === statusAgendamento.EM_ANDAMENTO) {
              const inicio = appointment.inicioAtendimento || new Date().toISOString();
              ags[idx].inicioAtendimento = inicio;
            } else if (newStatus === statusAgendamento.CONCLUIDO) {
              const fim = appointment.fimAtendimento || new Date().toISOString();
              ags[idx].fimAtendimento = fim;
              ags[idx].duracaoAtendimento = appointment.duracaoAtendimento || 0;
            }
            await updateDoc(pacienteRef, { agendamentos: ags });
          }
        }
      } catch {}

      if (
        newStatus === statusAgendamento.PENDENTE ||
        newStatus === statusAgendamento.CANCELADO
      ) {
        const texto =
          newStatus === statusAgendamento.PENDENTE
            ? 'Paciente não compareceu'
            : 'Consulta cancelada';
        const icone = newStatus === statusAgendamento.PENDENTE ? 'yellow' : 'red';
        await criarNotificacao({
          titulo: 'Agendamento',
          descricao: texto,
          icone,
          criadoEm: new Date().toISOString(),
          tipo: 'agendamento',
          lida: false,
          detalhes: { ...appointment },
        });
      }

      setStatusLoading(false);
      setStatusError(null);
    } catch (err) {
      setStatusLoading(false);
      setStatusError('Erro ao atualizar status.');
    }
  };

  // Função para excluir agendamento
  const handleDelete = async () => {
    if (!appointment) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await excluirAgendamento(appointment.id);
      setDeleteLoading(false);
      setDeleteError(null);
      if (onComplete) onComplete(appointment.id);
      onClose();
    } catch (err) {
      setDeleteLoading(false);
      setDeleteError('Erro ao excluir agendamento.');
    }
  };

  if (!isOpen || !appointment) return null;

  // ...existing code...

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          X
        </button>
        <h3 className={styles.title}>Detalhes do Agendamento</h3>
        <p><strong>Paciente:</strong> {appointment.nomePaciente}</p>
        <p>
          <strong>Data:</strong>{' '}
          {appointment.data
            ? (() => {
                try {
                  let d = appointment.data;
                  let parsed = d.includes('-')
                    ? parseDateFns(d, 'yyyy-MM-dd', new Date())
                    : parseDateFns(d, 'dd/MM/yyyy', new Date());
                  return formatDateFns(parsed, 'dd-MM-yyyy');
                } catch {
                  return appointment.data;
                }
              })()
            : '-'
          }
        </p>
        <p><strong>Hora:</strong> {appointment.hora}</p>
        <p><strong>Profissional:</strong> {profissionalNome}</p>
        <p><strong>Convênio:</strong> {convenioNome}</p>
        <p><strong>Procedimento:</strong> {procedimentoNome}</p>
        <p><strong>Motivo:</strong> {appointment.motivo || '-'}</p>
        <p><strong>Descrição:</strong> {appointment.detalhes}</p>
        <p>
          <strong>Status:</strong>{' '}
          <span
            className={`${styles.statusText} ${
              statusClassMap[appointment.status] || styles.statusAgendado
            }`}
          >
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </span>
        </p>
        {!readOnly && (
        <div className={styles.statusButtonsRow}>
          <button
            disabled={statusLoading || appointment.status === statusAgendamento.AGENDADO}
            className={`${styles.statusButton} ${appointment.status === statusAgendamento.AGENDADO ? styles.statusButtonActive : ''}`}
            onClick={() => handleStatusChange(statusAgendamento.AGENDADO)}
            type="button"
          >
            Agendado
          </button>
          <button
            disabled={statusLoading || appointment.status === statusAgendamento.CONFIRMADO}
            className={`${styles.statusButton} ${appointment.status === statusAgendamento.CONFIRMADO ? styles.statusButtonActive : ''}`}
            onClick={() => handleStatusChange(statusAgendamento.CONFIRMADO)}
            type="button"
          >
            Confirmado
          </button>
          <button
            disabled={statusLoading || appointment.status === statusAgendamento.EM_ANDAMENTO}
            className={`${styles.statusButton} ${appointment.status === statusAgendamento.EM_ANDAMENTO ? styles.statusButtonActive : ''}`}
            onClick={() => handleStatusChange(statusAgendamento.EM_ANDAMENTO)}
            type="button"
          >
            Em andamento
          </button>
          <button
            disabled={statusLoading || appointment.status === statusAgendamento.CANCELADO}
            className={`${styles.statusButton} ${appointment.status === statusAgendamento.CANCELADO ? styles.statusButtonActive : ''}`}
            onClick={() => handleStatusChange(statusAgendamento.CANCELADO)}
            type="button"
          >
            Cancelado
          </button>
          <button
            disabled={statusLoading || appointment.status === statusAgendamento.CONCLUIDO}
            className={`${styles.statusButton} ${appointment.status === statusAgendamento.CONCLUIDO ? styles.statusButtonActive : ''}`}
            onClick={() => setShowPaymentModal(true)}
            type="button"
          >
            Concluído
          </button>
          <button
            disabled={statusLoading || appointment.status === statusAgendamento.PENDENTE}
            className={`${styles.statusButton} ${appointment.status === statusAgendamento.PENDENTE ? styles.statusButtonActive : ''}`}
            onClick={() => handleStatusChange(statusAgendamento.PENDENTE)}
            type="button"
          >
            Pendente
          </button>
        </div>
        )}
        {showPaymentModal && (
          <div className={styles.paymentOverlay}>
            <div className={styles.paymentModal}>
              <h4 className={styles.paymentTitle}>Registrar pagamento</h4>
              <label className={styles.paymentLabel}>
                Valor a faturar
                <input
                  type="number"
                  value={billingValue}
                  onChange={e => setBillingValue(Number(e.target.value))}
                  className={styles.paymentSelect}
                />
              </label>
              <label className={styles.paymentLabel}>
                Forma de pagamento
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className={styles.paymentSelect}
                >
                  <option value="">Selecione</option>
                  <option value="Pix">Pix</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Transferência">Transferência</option>
                </select>
              </label>
              {appointment.convenio && appointment.convenio !== 'Particular' && !hasDefaultValue && (
                <label className={styles.paymentLabel}>
                  <input
                    type="checkbox"
                    checked={saveDefault}
                    onChange={e => setSaveDefault(e.target.checked)}
                  />{' '}
                  Salvar como padrão para este convênio + procedimento?
                </label>
              )}
              <div className={styles.paymentActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={async () => {
                    if (!paymentMethod || !appointment || billingValue <= 0) return;
                    try {
                      await addDoc(collection(firestore, 'contasAReceber'), {
                        vencimento: formatDateFns(new Date(), 'dd/MM/yyyy'),
                        cliente: appointment.nomePaciente,
                        descricao: 'Agendamento concluído',
                        valor: billingValue,
                        status: 'Recebido',
                        formaPagamento: paymentMethod,
                      });
                      if (
                        saveDefault &&
                        convenioKey &&
                        procedimentoSelecionado?.id &&
                        convenioKey !== 'Particular'
                      ) {
                        const novosValores = {
                          ...(procedimentoSelecionado.valoresConvenio || {}),
                          [convenioKey as string]: billingValue,
                        };
                        await atualizarProcedimento(procedimentoSelecionado.id, {
                          valoresConvenio: novosValores,
                        });
                        procedimentoSelecionado.valoresConvenio = novosValores;
                      }
                      await handleStatusChange(statusAgendamento.CONCLUIDO);
                      setShowPaymentModal(false);
                      setPaymentMethod('');
                    } catch {
                      // erro ao salvar
                    }
                  }}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
        {!readOnly && (
          <>
            <div className={styles.actionsRow}>
              <button
                className={styles.deleteButton}
                onClick={() => setShowConfirmDelete(true)}
                disabled={deleteLoading}
                type="button"
              >
                {deleteLoading ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
            {showConfirmDelete && (
              <ConfirmationModal
                isOpen={showConfirmDelete}
                message="Tem certeza que deseja excluir este agendamento? Esta ação não poderá ser desfeita."
                onConfirm={handleDelete}
                onCancel={() => setShowConfirmDelete(false)}
              />
            )}
            {statusError && <p className={styles.statusError}>{statusError}</p>}
            {deleteError && <p className={styles.statusError}>{deleteError}</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default AppointmentDetailsModal;
