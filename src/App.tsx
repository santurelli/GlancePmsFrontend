import React, { useState, useEffect } from "react";
import { Login } from "./Login";
import { PlanningGrid } from "./PlanningGrid";
import {
  getUserInfo,
  apiFetch,
  removeAuthToken,
  setAuthToken,
  UserInfo,
} from "./api";
import {
  Hotel,
  Plus,
  Settings,
  RefreshCw,
  LogOut,
  ShieldCheck,
  User,
  Users,
  Sparkles,
  MapPin,
  HelpCircle,
  Save,
  Trash2,
  CalendarRange,
  Globe,
  Download,
  DollarSign,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Pencil,
  Coins,
  Receipt,
  BedDouble,
  Search,
  Repeat,
  CalendarPlus,
} from "lucide-react";
import { CustomersPage } from "./CustomersPage";
import { StatisticsPage } from "./StatisticsPage";
import { TouristTaxSettingsModal } from "./TouristTaxSettingsModal";
import { TouristTaxReportPage } from "./TouristTaxReportPage";
import { ResetPasswordPage } from "./ResetPasswordPage";
import { AcceptInvitePage } from "./AcceptInvitePage";
import Swal from "sweetalert2";
import { PublicCheckinPage } from "./PublicCheckinPage";
import { DocumentScanner } from "./DocumentScanner";
const CITIZENSHIP_OPTIONS = [
  { name: "Italia", code: "100000100" },
  { name: "Germania", code: "100000012" },
  { name: "Francia", code: "100000021" },
  { name: "Spagna", code: "100000046" },
  { name: "Regno Unito", code: "100000027" },
  { name: "Stati Uniti", code: "100000201" },
  { name: "Svizzera", code: "100000047" },
  { name: "Austria", code: "100000003" },
  { name: "Belgio", code: "100000004" },
  { name: "Paesi Bassi", code: "100000034" },
  { name: "Polonia", code: "100000036" },
  { name: "Romania", code: "100000041" },
  { name: "Russia", code: "100000042" },
  { name: "Cina", code: "100000219" },
  { name: "Giappone", code: "100000223" },
  { name: "Canada", code: "100000202" },
  { name: "Australia", code: "100000501" },
  { name: "Brasile", code: "100000302" },
  { name: "Argentina", code: "100000301" },
  { name: "Albania", code: "100000001" },
];
interface Customer {
  id: number;
  tenantId: string;
  nome: string;
  cognome: string;
  sesso: string;
  dataNascita: string;
  luogoNascita: string;
  cittadinanza: string;
  tipoDocumento: string;
  numeroDocumento: string;
  luogoRilascio: string;
}
interface Room {
  id: number;
  name: string;
  type: string;
  capacity: number;
  icalToken: string;
}
interface Reservation {
  id: number;
  tenantId: string;
  room: { id: number; name: string };
  guestName: string;
  checkIn: string;
  checkOut: string;
  source: string;
  status: string;
  primaryCustomer?: Customer | null;
  checkinToken?: string;
  prezzoNotte?: number | null;
}
interface IcalSource {
  id: number;
  channelName: string;
  url: string;
  lastSyncedAt?: string;
}
interface RoomType {
  id: number;
  tenantId: string;
  name: string;
  prezzoNotte: number | null;
}
interface RoomTypeRate {
  id: number;
  dataInizio: string;
  dataFine: string;
  prezzoNotte: number;
  ricorrente: boolean;
  parentRateId: number | null;
}
interface ReservationCharge {
  id: number;
  descrizione: string;
  importo: number;
  dataInserimento: string;
}
interface TouristTaxGuest {
  guestId: number;
  nome: string;
  tassabile: boolean;
  motivoEsenzione: string | null;
  importo: number;
}
interface TouristTaxResult {
  totale: number;
  nottiTassabili: number;
  ospiti: TouristTaxGuest[];
}
interface ExemptionCategory {
  id: number;
  tenantId: string | null;
  nome: string;
  isDefault: boolean;
}
export const App: React.FC = () => {
  const pathname = window.location.pathname;
  const publicCheckinMatch = pathname.match(
    /^\/public\/checkin\/([a-zA-Z0-9-]+)$/,
  );
  const resetPasswordToken = new URLSearchParams(window.location.search).get(
    "token",
  );
  const acceptInviteToken = new URLSearchParams(window.location.search).get(
    "token",
  );
  const [user, setUser] = useState<UserInfo | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [appError, setAppError] = useState("");
  /* CRM Form & Search State variables */ const [
    selectedCustomer,
    setSelectedCustomer,
  ] = useState<Customer | null>(null);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [accompanyingGuests, setAccompanyingGuests] = useState<Customer[]>([]);
  /* New Customer Form State variables */ const [
    newCustomerNome,
    setNewCustomerNome,
  ] = useState("");
  const [newCustomerCognome, setNewCustomerCognome] = useState("");
  const [newCustomerSesso, setNewCustomerSesso] = useState("M");
  const [newCustomerBirth, setNewCustomerBirth] = useState("");
  const [newCustomerBirthPlace, setNewCustomerBirthPlace] = useState("");
  const [newCustomerCitizen, setNewCustomerCitizen] = useState("100000100");
  /* Default Italy */ const [newCustomerDocType, setNewCustomerDocType] =
    useState("CARTA_IDENTITA");
  const [newCustomerDocNum, setNewCustomerDocNum] = useState("");
  const [newCustomerDocPlace, setNewCustomerDocPlace] = useState("");
  /* Accompanying search & list states */ const [accSearch, setAccSearch] =
    useState("");
  const [accResults, setAccResults] = useState<Customer[]>([]);
  /* Scanner modal state */ const [showResScanner, setShowResScanner] =
    useState(false);
  /* Accompanying Quick Create states */ const [
    showCreateAccompanying,
    setShowCreateAccompanying,
  ] = useState(false);
  const [newAccNome, setNewAccNome] = useState("");
  const [newAccCognome, setNewAccCognome] = useState("");
  const [newAccSesso, setNewAccSesso] = useState("M");
  const [newAccBirth, setNewAccBirth] = useState("");
  const [newAccBirthPlace, setNewAccBirthPlace] = useState("");
  const [newAccCitizen, setNewAccCitizen] = useState("100000100");
  const [scannerTargetType, setScannerTargetType] = useState<
    "primary" | "accompanying"
  >("primary");
  /* Autocomplete debounced search for primary guest */ useEffect(() => {
    if (!customerSearch.trim()) {
      setCustomerResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await apiFetch(
          `/api/v1/customers/search?q=${customerSearch}`,
        );
        if (res.ok) {
          const data = await res.json();
          setCustomerResults(data);
        }
      } catch (e) {}
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [customerSearch]);
  /* Autocomplete debounced search for accompanying guests */ useEffect(() => {
    if (!accSearch.trim()) {
      setAccResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/v1/customers/search?q=${accSearch}`);
        if (res.ok) {
          const data = await res.json();
          setAccResults(data);
        }
      } catch (e) {}
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [accSearch]);
  /* Navigation view state */ const [view, setView] = useState<
    "calendar" | "rooms" | "customers" | "stats" | "touristTaxReport"
  >("calendar");
  /* Room page search and filters state */ const [
    roomSearchQuery,
    setRoomSearchQuery,
  ] = useState("");
  const [roomTypeFilter, setRoomTypeFilter] = useState("ALL");
  /* Dynamic room types list managed by the user */ const [
    roomTypes,
    setRoomTypes,
  ] = useState<RoomType[]>([]);
  const [newRoomTypeName, setNewRoomTypeName] = useState("");
  const [newRoomTypePrice, setNewRoomTypePrice] = useState("");
  const [editingRoomTypePrice, setEditingRoomTypePrice] = useState("");
  /* Seasonal rates (per room type) management */ const [
    ratesForRoomType,
    setRatesForRoomType,
  ] = useState<RoomType | null>(null);
  const [roomTypeRates, setRoomTypeRates] = useState<RoomTypeRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [newRateStart, setNewRateStart] = useState("");
  const [newRateEnd, setNewRateEnd] = useState("");
  const [newRatePrice, setNewRatePrice] = useState("");
  const [newRateRicorrente, setNewRateRicorrente] = useState(false);
  const [newRateParentId, setNewRateParentId] = useState<number | null>(null);
  const [editingRateId, setEditingRateId] = useState<number | null>(null);
  const [rateSearchQuery, setRateSearchQuery] = useState("");
  const [showPastPeriods, setShowPastPeriods] = useState(false);
  /* Subscription expired state */ const [
    subscriptionExpired,
    setSubscriptionExpired,
  ] = useState(false);
  /* Profile modal (change password) */ const [
    showProfileModal,
    setShowProfileModal,
  ] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);
  /* Team management modal */ const [showTeamModal, setShowTeamModal] =
    useState(false);
  const [teamMembers, setTeamMembers] = useState<
    { userId: number; email: string; role: string }[]
  >([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MANAGER");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteError, setInviteError] = useState("");
  /* User menu dropdown */ const [showUserMenu, setShowUserMenu] =
    useState(false);
  /* Multi-property: list of user's tenants + UI state */ const [
    userTenants,
    setUserTenants,
  ] = useState<{ id: number; businessName: string }[]>([]);
  const [showTenantSwitcher, setShowTenantSwitcher] = useState(false);
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantEmail, setNewTenantEmail] = useState("");
  const [addTenantError, setAddTenantError] = useState("");
  /* Add Room modal state */ const [showAddRoomModal, setShowAddRoomModal] =
    useState(false);
  const [showRoomTypesPanel, setShowRoomTypesPanel] = useState(false);
  /* Room Types management modal */ const [
    showRoomTypesModal,
    setShowRoomTypesModal,
  ] = useState(false);
  const [editingRoomTypeId, setEditingRoomTypeId] = useState<number | null>(
    null,
  );
  const [editingRoomTypeName, setEditingRoomTypeName] = useState("");
  /* Modals state */ const [showReservationModal, setShowReservationModal] =
    useState(false);
  const [activeResTab, setActiveResTab] = useState<
    "soggiorno" | "cliente" | "accompagnatori" | "tassa" | "ricevuta"
  >("soggiorno");
  const [showIcalModal, setShowIcalModal] = useState(false);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  /* Room Form fields */ const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState("");
  const [newRoomCapacity, setNewRoomCapacity] = useState(2);
  const [selectedRoomForEdit, setSelectedRoomForEdit] = useState<Room | null>(
    null,
  );
  /* Reservation Form fields (Used for both Create and Edit) */ const [
    selectedReservationForEdit,
    setSelectedReservationForEdit,
  ] = useState<Reservation | null>(null);
  const [newResGuest, setNewResGuest] = useState("");
  const [newResRoomId, setNewResRoomId] = useState("");
  const [newResCheckIn, setNewResCheckIn] = useState("");
  const [newResCheckOut, setNewResCheckOut] = useState("");
  const [newResSource, setNewResSource] = useState("DIRECT");
  const [newResPrice, setNewResPrice] = useState("");
  /* iCal Form fields */ const [selectedIcalRoomId, setSelectedIcalRoomId] =
    useState<number | null>(null);
  const [icalSources, setIcalSources] = useState<IcalSource[]>([]);
  const [newIcalChannel, setNewIcalChannel] = useState("AIRBNB");
  const [newIcalUrl, setNewIcalUrl] = useState("");
  /* Compliance Form fields */ const [complianceDate, setComplianceDate] =
    useState(new Date().toISOString().split("T")[0]);
  /* Tourist Tax modal & reservation-section state */ const [
    showTouristTaxSettingsModal,
    setShowTouristTaxSettingsModal,
  ] = useState(false);
  const [touristTaxResult, setTouristTaxResult] =
    useState<TouristTaxResult | null>(null);
  const [touristTaxLoading, setTouristTaxLoading] = useState(false);
  const [touristTaxError, setTouristTaxError] = useState("");
  const [exemptionCategories, setExemptionCategories] = useState<
    ExemptionCategory[]
  >([]);
  const [guestExemptionOverrides, setGuestExemptionOverrides] = useState<
    Record<number, string>
  >({});
  /* Extra charges (linen change, minibar, damages...) added on top of the room rate */ const [
    charges,
    setCharges,
  ] = useState<ReservationCharge[]>([]);
  const [newChargeDesc, setNewChargeDesc] = useState("");
  const [newChargeAmount, setNewChargeAmount] = useState("");
  /* Language the PDF receipt is generated in â€” chosen by the host at download time, since (unlike */ /* check-in) there's no guest-driven moment here to infer it from. */ const [
    receiptLang,
    setReceiptLang,
  ] = useState<"it" | "en" | "es" | "de" | "fr">("it");
  useEffect(() => {
    const info = getUserInfo();
    if (info) {
      setUser(info);
    }
  }, []);
  useEffect(() => {
    const handler = () => setSubscriptionExpired(true);
    window.addEventListener("subscription-expired", handler);
    return () => window.removeEventListener("subscription-expired", handler);
  }, []);
  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setAppError("");
    try {
      const roomsRes = await apiFetch("/api/rooms");
      const resRes = await apiFetch("/api/reservations");
      const typesRes = await apiFetch("/api/room-types");
      if (!roomsRes.ok || !resRes.ok || !typesRes.ok) {
        throw new Error("Impossibile caricare i dati del PMS");
      }
      const roomsData = await roomsRes.json();
      const resData = await resRes.json();
      const typesData = await typesRes.json();
      setRooms(roomsData);
      setReservations(resData);
      setRoomTypes(typesData);
    } catch (err: any) {
      setAppError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (user) {
      fetchData();
      fetchUserTenants();
    }
  }, [user]);
  const fetchUserTenants = async () => {
    try {
      const res = await apiFetch("/api/auth/my-tenants");
      if (res.ok) setUserTenants(await res.json());
    } catch (_) {}
  };
  const handleSwitchTenant = async (tenantId: number) => {
    try {
      const res = await apiFetch("/api/auth/switch-tenant", {
        method: "POST",
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) throw new Error("Impossibile cambiare struttura");
      const data = await res.json();
      setAuthToken(data.token);
      window.location.reload();
    } catch (err: any) {
      setAppError(err.message);
    }
  };
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess(false);
    if (newPassword !== confirmPassword) {
      setProfileError("Le password non coincidono");
      return;
    }
    if (newPassword.length < 8) {
      setProfileError("Minimo 8 caratteri");
      return;
    }
    try {
      const res = await apiFetch("/api/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Errore");
      }
      setProfileSuccess(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setProfileError(err.message);
    }
  };
  const fetchTeam = async () => {
    try {
      const res = await apiFetch("/api/auth/team");
      if (res.ok) setTeamMembers(await res.json());
    } catch (_) {}
  };
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteMessage("");
    try {
      const res = await apiFetch("/api/auth/invite", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || "Errore");
      setInviteMessage(d.message || "Operazione completata");
      setInviteEmail("");
      fetchTeam();
    } catch (err: any) {
      setInviteError(err.message);
    }
  };
  const handleRemoveTeamMember = async (userId: number) => {
    try {
      await apiFetch(`/api/auth/team/${userId}`, { method: "DELETE" });
      fetchTeam();
    } catch (_) {}
  };
  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddTenantError("");
    try {
      const res = await apiFetch("/api/auth/add-tenant", {
        method: "POST",
        body: JSON.stringify({
          businessName: newTenantName,
          businessEmail: newTenantEmail,
        }),
      });
      if (res.status === 402) {
        const data = await res.json();
        setAddTenantError(data.message);
        return;
      }
      if (!res.ok) throw new Error("Errore nella creazione della struttura");
      const data = await res.json();
      setAuthToken(data.token);
      window.location.reload();
    } catch (err: any) {
      setAddTenantError(err.message);
    }
  };
  useEffect(() => {
    if (roomTypes.length > 0) {
      if (!roomTypes.some((rt) => rt.name === newRoomType)) {
        setNewRoomType(roomTypes[0].name);
      }
    } else {
      setNewRoomType("");
    }
  }, [roomTypes, newRoomType]);
  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
  };
  const handleAuthSuccess = () => {
    setUser(getUserInfo());
  };
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppError("");
    try {
      const isEdit = selectedRoomForEdit !== null;
      const url = isEdit
        ? `/api/rooms/${selectedRoomForEdit.id}`
        : "/api/rooms";
      const res = await apiFetch(url, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify({
          name: newRoomName,
          type: newRoomType,
          capacity: newRoomCapacity,
        }),
      });
      if (!res.ok)
        throw new Error(
          isEdit
            ? "Errore nella modifica della camera"
            : "Errore nella creazione della camera",
        );
      setNewRoomName("");
      setNewRoomType("");
      setNewRoomCapacity(2);
      setSelectedRoomForEdit(null);
      setShowAddRoomModal(false);
      setShowRoomTypesPanel(false);
      fetchData();
    } catch (err: any) {
      setAppError(err.message);
    }
  };
  const handleEditRoomClick = (room: Room) => {
    setSelectedRoomForEdit(room);
    setNewRoomName(room.name);
    setNewRoomType(room.type);
    setNewRoomCapacity(room.capacity);
    setShowAddRoomModal(true);
  };
  const handleDeleteRoom = async (roomId: number) => {
    const confirmed = await Swal.fire({
      title: "Elimina Camera",
      text: "Sei sicuro di voler eliminare questa camera? VerrÃ  eliminata ogni prenotazione associata.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "SÃ¬, elimina",
      cancelButtonText: "Annulla",
      background: "rgba(255, 255, 255, 0.9)",
      backdrop: "rgba(15, 23, 42, 0.3)",
      customClass: {
        popup:
          "rounded-2xl border border-slate-200/50 backdrop-blur-md shadow-2xl font-sans",
        title: "text-slate-900 font-extrabold text-lg",
        htmlContainer: "text-slate-500 font-medium text-xs",
        confirmButton:
          "px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-md active:scale-95 transition-all text-white bg-red-500 hover:bg-red-600",
        cancelButton:
          "px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-sm active:scale-95 transition-all text-slate-700 bg-slate-100 hover:bg-slate-200 ml-2",
      },
      buttonsStyling: false,
    });
    if (!confirmed.isConfirmed) return;
    setAppError("");
    try {
      const res = await apiFetch(`/api/rooms/${roomId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore nella rimozione della camera");
      fetchData();
    } catch (err: any) {
      setAppError(err.message);
    }
  };
  const handleAddRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTypeName.trim()) return;
    setAppError("");
    try {
      const res = await apiFetch("/api/room-types", {
        method: "POST",
        body: JSON.stringify({
          name: newRoomTypeName.trim(),
          prezzoNotte:
            newRoomTypePrice === "" ? null : parseFloat(newRoomTypePrice),
        }),
      });
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("Questa tipologia esiste giÃ !");
        }
        throw new Error("Errore nella creazione della tipologia");
      }
      setNewRoomTypeName("");
      setNewRoomTypePrice("");
      fetchData();
    } catch (err: any) {
      setAppError(err.message);
    }
  };
  const handleDeleteRoomType = async (typeId: number) => {
    const confirmed = await Swal.fire({
      title: "Elimina Tipologia",
      text: "Sei sicuro di voler eliminare questa tipologia di camera? Assicurati che non ci siano camere associate ad essa.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "SÃ¬, elimina",
      cancelButtonText: "Annulla",
      background: "rgba(255, 255, 255, 0.9)",
      backdrop: "rgba(15, 23, 42, 0.3)",
      customClass: {
        popup:
          "rounded-2xl border border-slate-200/50 backdrop-blur-md shadow-2xl font-sans",
        title: "text-slate-900 font-extrabold text-lg",
        htmlContainer: "text-slate-500 font-medium text-xs",
        confirmButton:
          "px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-md active:scale-95 transition-all text-white bg-red-500 hover:bg-red-600",
        cancelButton:
          "px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-sm active:scale-95 transition-all text-slate-700 bg-slate-100 hover:bg-slate-200 ml-2",
      },
      buttonsStyling: false,
    });
    if (!confirmed.isConfirmed) return;
    setAppError("");
    try {
      const res = await apiFetch(`/api/room-types/${typeId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Errore nella rimozione della tipologia");
      fetchData();
    } catch (err: any) {
      setAppError(err.message);
    }
  };
  const handleUpdateRoomType = async (
    id: number,
    newName: string,
    newPrice: string,
  ) => {
    if (!newName.trim()) return;
    try {
      const res = await apiFetch(`/api/room-types/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: newName.trim(),
          prezzoNotte: newPrice === "" ? null : parseFloat(newPrice),
        }),
      });
      if (res.status === 409) throw new Error("Questa tipologia esiste giÃ !");
      if (!res.ok) throw new Error("Errore nella modifica della tipologia");
      setEditingRoomTypeId(null);
      setEditingRoomTypeName("");
      setEditingRoomTypePrice("");
      fetchData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Errore",
        text: err.message,
        background: "rgba(255,255,255,0.95)",
      });
    }
  };
  const openRoomRatesModal = async (rt: RoomType) => {
    setRatesForRoomType(rt);
    cancelEditRate();
    setRateSearchQuery("");
    setShowPastPeriods(false);
    setRatesLoading(true);
    try {
      const res = await apiFetch(`/api/room-types/${rt.id}/rates`);
      if (res.ok) setRoomTypeRates(await res.json());
    } catch (_) {
    } finally {
      setRatesLoading(false);
    }
  };
  const cancelEditRate = () => {
    setEditingRateId(null);
    setNewRateStart("");
    setNewRateEnd("");
    setNewRatePrice("");
    setNewRateRicorrente(false);
    setNewRateParentId(null);
  };
  const startEditRate = (rate: RoomTypeRate) => {
    setEditingRateId(rate.id);
    setNewRateStart(rate.dataInizio);
    setNewRateEnd(rate.dataFine);
    setNewRatePrice(String(rate.prezzoNotte));
    setNewRateRicorrente(rate.ricorrente);
    setNewRateParentId(rate.parentRateId);
  };
  /* Pre-fills the form with the recurring rule's month/day (bumped a year ahead, since that's the */ /* most likely year to need an override) so the user only has to adjust the price and confirm. */ const startAddException =
    (parentRate: RoomTypeRate) => {
      setEditingRateId(null);
      const nextYear = new Date(parentRate.dataInizio).getFullYear() + 1;
      const withNextYear = (iso: string) => `${nextYear}-${iso.slice(5)}`;
      setNewRateStart(withNextYear(parentRate.dataInizio));
      setNewRateEnd(withNextYear(parentRate.dataFine));
      setNewRatePrice(String(parentRate.prezzoNotte));
      setNewRateRicorrente(false);
      setNewRateParentId(parentRate.id);
    };
  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratesForRoomType || !newRateStart || !newRateEnd || !newRatePrice)
      return;
    const isEdit = editingRateId !== null;
    try {
      const url = isEdit
        ? `/api/room-types/${ratesForRoomType.id}/rates/${editingRateId}`
        : `/api/room-types/${ratesForRoomType.id}/rates`;
      const res = await apiFetch(url, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify({
          dataInizio: newRateStart,
          dataFine: newRateEnd,
          prezzoNotte: parseFloat(newRatePrice),
          ricorrente: newRateRicorrente,
          parentRateId: newRateParentId,
        }),
      });
      if (res.status === 409) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.message || "Questo periodo si sovrappone a uno giÃ  impostato",
        );
      }
      if (!res.ok)
        throw new Error(
          isEdit
            ? "Impossibile modificare il periodo"
            : "Impossibile aggiungere il periodo",
        );
      cancelEditRate();
      openRoomRatesModal(ratesForRoomType);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Errore",
        text: err.message,
        background: "rgba(255,255,255,0.95)",
      });
    }
  };
  const formatRateRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const sameYear = s.getFullYear() === e.getFullYear();
    const startStr = s.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: sameYear ? undefined : "numeric",
    });
    const endStr = e.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${startStr} â†’ ${endStr}`;
  };
  /* Recurring rules repeat every year, so the year they happen to be stored with is meaningless â€” never show it. */ const formatRecurringRange =
    (start: string, end: string) => {
      const s = new Date(start);
      const e = new Date(end);
      return `${s.toLocaleDateString("it-IT", { day: "numeric", month: "short" })} â†’ ${e.toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`;
    };
  const rateMatchesSearch = (rate: RoomTypeRate, query: string) => {
    if (!query) return true;
    const q = query.trim().toLowerCase();
    const label =
      `${formatRateRange(rate.dataInizio, rate.dataFine)} ${new Date(rate.dataInizio).getFullYear()} ${new Date(rate.dataFine).getFullYear()}`.toLowerCase();
    return label.includes(q) || String(rate.prezzoNotte).includes(q);
  };
  const handleDeleteRate = async (rateId: number, extraWarning?: string) => {
    if (!ratesForRoomType) return;
    const confirmed = await Swal.fire({
      title: "Eliminare il periodo?",
      text: `La tariffa base tornerÃ  ad applicarsi a queste date.${extraWarning || ""}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "SÃ¬, elimina",
      cancelButtonText: "Annulla",
      background: "rgba(255, 255, 255, 0.9)",
      customClass: {
        confirmButton:
          "px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-md active:scale-95 transition-all text-white bg-red-500 hover:bg-red-600",
        cancelButton:
          "px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-sm active:scale-95 transition-all text-slate-700 bg-slate-100 hover:bg-slate-200 ml-2",
      },
      buttonsStyling: false,
    });
    if (!confirmed.isConfirmed) return;
    try {
      const res = await apiFetch(
        `/api/room-types/${ratesForRoomType.id}/rates/${rateId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Impossibile eliminare il periodo");
      setRoomTypeRates(roomTypeRates.filter((r) => r.id !== rateId));
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Errore",
        text: err.message,
        background: "rgba(255,255,255,0.95)",
      });
    }
  };
  /* Click on existing reservation triggers editing mode */ const handleReservationClick =
    (res: Reservation) => {
      setSelectedReservationForEdit(res);
      setNewResGuest(
        res.guestName.replace(/\[iCal\]\s?|\[Airbnb\]\s?|\[Booking\]\s?/, ""),
      );
      /* Strip tags if present */ setNewResRoomId(res.room.id.toString());
      setNewResCheckIn(res.checkIn);
      setNewResCheckOut(res.checkOut);
      setNewResSource(res.source);
      setNewResPrice(res.prezzoNotte != null ? String(res.prezzoNotte) : "");
      /* Sync CRM states */ setSelectedCustomer(res.primaryCustomer || null);
      setShowCreateCustomer(false);
      setCustomerSearch("");
      setCustomerResults([]);
      setAccompanyingGuests([]);
      setAccSearch("");
      setAccResults([]);
      setGuestExemptionOverrides({});
      fetchExemptionCategories();
      setCharges([]);
      if (res.id) {
        apiFetch(`/api/reservations/${res.id}/accompanying`)
          .then(async (response) => {
            if (response.ok) {
              const data = await response.json();
              setAccompanyingGuests(data);
            }
          })
          .catch(() => {});
        seedGuestExemptionOverrides(res.id);
        fetchCharges(res.id);
      }
      setActiveResTab("soggiorno");
      setShowReservationModal(true);
    };
  const handleCellClick = (roomId: number, date: Date) => {
    setSelectedReservationForEdit(null);
    setNewResGuest("");
    setNewResRoomId(roomId.toString());
    setNewResCheckIn(date.toISOString().split("T")[0]);
    /* Default checkout is next day */ const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    setNewResCheckOut(nextDay.toISOString().split("T")[0]);
    setNewResSource("DIRECT");
    setNewResPrice("");
    /* suggerito automaticamente dall'effect qui sotto, appena data + camera sono valorizzate */ /* Reset CRM states */ setSelectedCustomer(
      null,
    );
    setShowCreateCustomer(false);
    setCustomerSearch("");
    setCustomerResults([]);
    setAccompanyingGuests([]);
    setAccSearch("");
    setAccResults([]);
    setGuestExemptionOverrides({});
    fetchExemptionCategories();
    setCharges([]);
    /* Clear new customer form fields */ setNewCustomerNome("");
    setNewCustomerCognome("");
    setNewCustomerSesso("M");
    setNewCustomerBirth("");
    setNewCustomerBirthPlace("");
    setNewCustomerCitizen("100000100");
    setNewCustomerDocType("CARTA_IDENTITA");
    setNewCustomerDocNum("");
    setNewCustomerDocPlace("");
    setTouristTaxResult(null);
    setTouristTaxError("");
    setActiveResTab("soggiorno");
    setShowReservationModal(true);
  };
  const closeReservationModal = () => {
    setShowReservationModal(false);
    setSelectedReservationForEdit(null);
    setTouristTaxResult(null);
    setTouristTaxError("");
    setGuestExemptionOverrides({});
    setNewResGuest("");
    setNewResRoomId("");
    setNewResCheckIn("");
    setNewResCheckOut("");
    setNewResSource("DIRECT");
    setNewResPrice("");
    /* Clear CRM states */ setSelectedCustomer(null);
    setShowCreateCustomer(false);
    setCustomerSearch("");
    setCustomerResults([]);
    setAccompanyingGuests([]);
    setAccSearch("");
    setAccResults([]);
  };
  /* Submit handler handles both Create (POST) and Edit (PUT) */ const handleSaveReservation =
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAppError("");
      try {
        let currentCustomer = selectedCustomer;
        /* 1. If receptionist filled the "Create/Edit Customer" form, persist it first */ if (
          showCreateCustomer
        ) {
          if (!newCustomerNome || !newCustomerCognome || !newCustomerBirth) {
            throw new Error(
              "Compila tutti i campi obbligatori per il cliente (Nome, Cognome, Data Nascita).",
            );
          }
          const bodyData = {
            nome: newCustomerNome,
            cognome: newCustomerCognome,
            sesso: newCustomerSesso,
            dataNascita: newCustomerBirth,
            luogoNascita: newCustomerBirthPlace,
            cittadinanza: newCustomerCitizen,
            tipoDocumento: newCustomerDocType,
            numeroDocumento: newCustomerDocNum,
            luogoRilascio: newCustomerDocPlace,
          };
          const isEditCustomer = selectedCustomer !== null;
          const custUrl = isEditCustomer
            ? `/api/v1/customers/${selectedCustomer.id}`
            : "/api/v1/customers";
          const custMethod = isEditCustomer ? "PUT" : "POST";
          const custRes = await apiFetch(custUrl, {
            method: custMethod,
            body: JSON.stringify(bodyData),
          });
          if (!custRes.ok) {
            throw new Error("Impossibile salvare l'anagrafica del cliente.");
          }
          currentCustomer = await custRes.json();
        }
        /* 2. Build complete reservation payload */ const payload = {
          guestName: currentCustomer
            ? `${currentCustomer.cognome} ${currentCustomer.nome}`
            : newResGuest,
          checkIn: newResCheckIn,
          checkOut: newResCheckOut,
          source: newResSource,
          room: { id: parseInt(newResRoomId) },
          status: selectedReservationForEdit
            ? selectedReservationForEdit.status
            : "CONFIRMED",
          primaryCustomer: currentCustomer ? { id: currentCustomer.id } : null,
          prezzoNotte: newResPrice === "" ? null : parseFloat(newResPrice),
          accompanyingGuests: accompanyingGuests.map((ag) => ({
            customerId: ag.id,
            tipoAlloggiati:
              "FAMILIARE" /* Default association type in receptionist modal */,
          })),
        };
        const isEdit = selectedReservationForEdit !== null;
        const url = isEdit
          ? `/api/reservations/${selectedReservationForEdit.id}`
          : "/api/reservations";
        const method = isEdit ? "PUT" : "POST";
        const res = await apiFetch(url, {
          method,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Errore durante il salvataggio");
        }
        closeReservationModal();
        fetchData();
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "Errore",
          text: err.message,
          background: "rgba(255,255,255,0.95)",
          customClass: {
            popup:
              "rounded-2xl border border-slate-200/50 shadow-2xl font-sans",
            confirmButton:
              "px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-md text-white bg-accent-500 hover:bg-accent-600",
          },
          buttonsStyling: false,
        });
      }
    };
  const handleResOcrSuccess = (data: {
    nome: string;
    cognome: string;
    sesso: string;
    dataNascita: string;
    numeroDocumento: string;
  }) => {
    setShowResScanner(false);
    if (scannerTargetType === "primary") {
      setNewCustomerNome(data.nome);
      setNewCustomerCognome(data.cognome);
      setNewCustomerSesso(data.sesso);
      setNewCustomerBirth(data.dataNascita);
      setNewCustomerDocNum(data.numeroDocumento);
    } else {
      setNewAccNome(data.nome);
      setNewAccCognome(data.cognome);
      setNewAccSesso(data.sesso);
      setNewAccBirth(data.dataNascita);
    }
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Scansione OCR completata!",
      showConfirmButton: false,
      timer: 2000,
      background: "rgba(255, 255, 255, 0.95)",
    });
  };
  const handleSaveAccompanyingGuest = async () => {
    if (!newAccNome || !newAccCognome || !newAccBirth) {
      Swal.fire({
        icon: "error",
        title: "Campi mancanti",
        text: "Compila tutti i campi obbligatori per l'accompagnatore (Nome, Cognome, Data Nascita).",
        background: "rgba(255, 255, 255, 0.95)",
      });
      return;
    }
    try {
      const bodyData = {
        nome: newAccNome,
        cognome: newAccCognome,
        sesso: newAccSesso,
        dataNascita: newAccBirth,
        luogoNascita: newAccBirthPlace,
        cittadinanza: newAccCitizen,
      };
      const res = await apiFetch("/api/v1/customers", {
        method: "POST",
        body: JSON.stringify(bodyData),
      });
      if (!res.ok) {
        throw new Error("Impossibile salvare l'accompagnatore.");
      }
      const savedCustomer = await res.json();
      setAccompanyingGuests([...accompanyingGuests, savedCustomer]);
      /* Clear fields */ setNewAccNome("");
      setNewAccCognome("");
      setNewAccSesso("M");
      setNewAccBirth("");
      setNewAccBirthPlace("");
      setNewAccCitizen("100000100");
      setShowCreateAccompanying(false);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Accompagnatore aggiunto!",
        showConfirmButton: false,
        timer: 2000,
        background: "rgba(255, 255, 255, 0.95)",
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Errore",
        text: err.message || "Errore nel salvataggio dell'accompagnatore.",
        background: "rgba(255, 255, 255, 0.95)",
      });
    }
  };
  const handleSavePrimaryCustomer = async () => {
    if (!newCustomerNome || !newCustomerCognome || !newCustomerBirth) {
      Swal.fire({
        icon: "error",
        title: "Campi mancanti",
        text: "Compila tutti i campi obbligatori per il cliente (Nome, Cognome, Data Nascita).",
        background: "rgba(255, 255, 255, 0.95)",
      });
      return;
    }
    try {
      const bodyData = {
        nome: newCustomerNome,
        cognome: newCustomerCognome,
        sesso: newCustomerSesso,
        dataNascita: newCustomerBirth,
        luogoNascita: newCustomerBirthPlace,
        cittadinanza: newCustomerCitizen,
        tipoDocumento: newCustomerDocType,
        numeroDocumento: newCustomerDocNum,
        luogoRilascio: newCustomerDocPlace,
      };
      const isEditCustomer = selectedCustomer !== null;
      const custUrl = isEditCustomer
        ? `/api/v1/customers/${selectedCustomer.id}`
        : "/api/v1/customers";
      const custMethod = isEditCustomer ? "PUT" : "POST";
      const custRes = await apiFetch(custUrl, {
        method: custMethod,
        body: JSON.stringify(bodyData),
      });
      if (!custRes.ok) {
        throw new Error("Impossibile salvare l'anagrafica del cliente.");
      }
      const savedCustomer = await custRes.json();
      setSelectedCustomer(savedCustomer);
      setCustomerSearch(`${savedCustomer.cognome} ${savedCustomer.nome}`);
      setShowCreateCustomer(false);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Anagrafica cliente salvata!",
        showConfirmButton: false,
        timer: 2000,
        background: "rgba(255, 255, 255, 0.95)",
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Errore",
        text: err.message || "Errore nel salvataggio dell'anagrafica.",
        background: "rgba(255, 255, 255, 0.95)",
      });
    }
  };
  /* Delete Reservation handler */ const handleDeleteReservation = async () => {
    if (!selectedReservationForEdit) return;
    const confirmed = await Swal.fire({
      title: "Elimina Prenotazione",
      text: "Sei sicuro di voler eliminare definitivamente questa prenotazione?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "SÃ¬, elimina",
      cancelButtonText: "Annulla",
      background: "rgba(255, 255, 255, 0.9)",
      backdrop: "rgba(15, 23, 42, 0.3)",
      customClass: {
        popup:
          "rounded-2xl border border-slate-200/50 backdrop-blur-md shadow-2xl font-sans",
        title: "text-slate-900 font-extrabold text-lg",
        htmlContainer: "text-slate-500 font-medium text-xs",
        confirmButton:
          "px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-md active:scale-95 transition-all text-white bg-red-500 hover:bg-red-600",
        cancelButton:
          "px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-sm active:scale-95 transition-all text-slate-700 bg-slate-100 hover:bg-slate-200 ml-2",
      },
      buttonsStyling: false,
    });
    if (!confirmed.isConfirmed) return;
    setAppError("");
    try {
      const res = await apiFetch(
        `/api/reservations/${selectedReservationForEdit.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Errore durante la rimozione");
      closeReservationModal();
      fetchData();
    } catch (err: any) {
      setAppError(err.message);
    }
  };
  const handleIcalRoomSelect = async (roomId: number) => {
    setSelectedIcalRoomId(roomId);
    setIcalSources([]);
    try {
      const res = await apiFetch(`/api/v1/ical/sources?roomId=${roomId}`);
      if (res.ok) {
        const data = await res.json();
        setIcalSources(data);
      }
    } catch (e) {}
  };
  const handleAddIcalSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIcalRoomId) return;
    try {
      await apiFetch("/api/v1/ical/sources", {
        method: "POST",
        body: JSON.stringify({
          roomId: selectedIcalRoomId,
          channelName: newIcalChannel,
          url: newIcalUrl,
        }),
      });
      setNewIcalUrl("");
      handleIcalRoomSelect(selectedIcalRoomId);
    } catch (e) {}
  };
  const triggerAlloggiatiWebExport = async () => {
    try {
      const res = await apiFetch(
        `/api/v1/reports/alloggiati?date=${complianceDate}`,
      );
      if (!res.ok)
        throw new Error("Errore nella generazione del report alloggiati");
      const blob = await res.blob();
      if (blob.size === 0) {
        Swal.fire({
          icon: "info",
          title: "Nessun dato",
          text: "Non ci sono dati da inserire nel file per la data selezionata.",
          background: "rgba(255,255,255,0.95)",
        });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `alloggiati_${complianceDate}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Errore export",
        text: err.message,
        background: "rgba(255,255,255,0.95)",
      });
    }
  };
  /* One-off seed of manual exemption selections from the last-saved state of an existing */ /* reservation, so the live preview below starts from what's actually persisted. The preview */ /* itself (see effect below) is what keeps the total in sync with in-progress form edits. */ const seedGuestExemptionOverrides =
    async (reservationId: number) => {
      try {
        const res = await apiFetch(
          `/api/reservations/${reservationId}/tourist-tax`,
        );
        if (!res.ok) return;
        const data: TouristTaxResult = await res.json();
        const overrides: Record<number, string> = {};
        data.ospiti.forEach((g) => {
          if (!g.tassabile && g.motivoEsenzione)
            overrides[g.guestId] = g.motivoEsenzione;
        });
        setGuestExemptionOverrides(overrides);
      } catch (_) {}
    };
  const fetchExemptionCategories = async () => {
    try {
      const res = await apiFetch("/api/tourist-tax/exemption-categories");
      if (res.ok) setExemptionCategories(await res.json());
    } catch (_) {}
  };
  const assignGuestExemption = async (
    guestId: number,
    exemptionCategoryNome: string,
    exemptionCategoryId: number,
  ) => {
    setGuestExemptionOverrides((prev) => ({
      ...prev,
      [guestId]: exemptionCategoryNome,
    }));
    if (!selectedReservationForEdit) return;
    /* not yet persisted: preview-only until the reservation is saved */ try {
      const res = await apiFetch(
        `/api/reservations/${selectedReservationForEdit.id}/guest-exemptions`,
        {
          method: "POST",
          body: JSON.stringify({ customerId: guestId, exemptionCategoryId }),
        },
      );
      if (!res.ok) throw new Error("Impossibile assegnare l'esenzione");
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Errore",
        text: err.message,
        background: "rgba(255,255,255,0.95)",
      });
    }
  };
  const removeGuestExemption = async (guestId: number) => {
    setGuestExemptionOverrides((prev) => {
      const next = { ...prev };
      delete next[guestId];
      return next;
    });
    if (!selectedReservationForEdit) return;
    try {
      const res = await apiFetch(
        `/api/reservations/${selectedReservationForEdit.id}/guest-exemptions/${guestId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Impossibile rimuovere l'esenzione");
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Errore",
        text: err.message,
        background: "rgba(255,255,255,0.95)",
      });
    }
  };
  const fetchCharges = async (reservationId: number) => {
    try {
      const res = await apiFetch(`/api/reservations/${reservationId}/charges`);
      if (res.ok) setCharges(await res.json());
    } catch (_) {}
  };
  const handleAddCharge = async () => {
    if (
      !selectedReservationForEdit ||
      !newChargeDesc.trim() ||
      !newChargeAmount
    )
      return;
    try {
      const res = await apiFetch(
        `/api/reservations/${selectedReservationForEdit.id}/charges`,
        {
          method: "POST",
          body: JSON.stringify({
            descrizione: newChargeDesc.trim(),
            importo: parseFloat(newChargeAmount),
          }),
        },
      );
      if (!res.ok) throw new Error("Impossibile aggiungere la voce extra");
      setNewChargeDesc("");
      setNewChargeAmount("");
      fetchCharges(selectedReservationForEdit.id);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Errore",
        text: err.message,
        background: "rgba(255,255,255,0.95)",
      });
    }
  };
  const handleDownloadReceipt = async () => {
    if (!selectedReservationForEdit) return;
    try {
      const res = await apiFetch(
        `/api/reservations/${selectedReservationForEdit.id}/receipt?lang=${receiptLang}`,
      );
      if (!res.ok) throw new Error("Impossibile generare la ricevuta");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ricevuta_${selectedReservationForEdit.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Errore",
        text: err.message,
        background: "rgba(255,255,255,0.95)",
      });
    }
  };
  const handleDeleteCharge = async (chargeId: number) => {
    if (!selectedReservationForEdit) return;
    try {
      const res = await apiFetch(
        `/api/reservations/${selectedReservationForEdit.id}/charges/${chargeId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Impossibile eliminare la voce extra");
      setCharges((prev) => prev.filter((c) => c.id !== chargeId));
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Errore",
        text: err.message,
        background: "rgba(255,255,255,0.95)",
      });
    }
  };
  /* Suggests the nightly price for a new reservation once room + dates are set, using the room */ /* type's seasonal rate calendar (night-by-night, so a stay crossing a season boundary gets a */ /* correct blended average instead of a single flat rate). Never overwrites a price the user has */ /* already set â€” either by hand or from a previous suggestion â€” so editing dates after typing a */ /* custom price won't silently change it. */ /* Reset the auto-suggested price whenever the room changes in create mode, */ /* so the effect below can fetch the correct rate for the new room. */ const prevRoomIdRef =
    React.useRef<string>("");
  useEffect(() => {
    if (
      newResRoomId &&
      newResRoomId !== prevRoomIdRef.current &&
      prevRoomIdRef.current !== ""
    ) {
      setNewResPrice("");
    }
    prevRoomIdRef.current = newResRoomId;
  }, [newResRoomId]);
  useEffect(() => {
    if (
      newResPrice !== "" ||
      !newResRoomId ||
      !newResCheckIn ||
      !newResCheckOut
    )
      return;
    if (newResCheckIn >= newResCheckOut) return;
    const room = rooms.find((r) => r.id === parseInt(newResRoomId));
    const rt = room ? roomTypes.find((t) => t.name === room.type) : null;
    if (!rt) return;
    let cancelled = false;
    apiFetch(
      `/api/room-types/${rt.id}/rate-for-stay?checkIn=${newResCheckIn}&checkOut=${newResCheckOut}`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && data.prezzoNotteMedio != null) {
          setNewResPrice(String(data.prezzoNotteMedio));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    newResRoomId,
    newResCheckIn,
    newResCheckOut,
    newResPrice,
    rooms,
    roomTypes,
  ]);
  /* Live preview of the tourist tax, reacting to in-progress form edits (dates, guests, manual */ /* exemptions) instead of only reflecting what was last saved to the server. */ useEffect(() => {
    if (!showReservationModal || newResSource === "EXTERNAL_ICAL") return;
    if (!newResCheckIn || !newResCheckOut || newResCheckIn >= newResCheckOut) {
      setTouristTaxResult(null);
      setTouristTaxError("");
      return;
    }
    const ospiti: {
      guestId: number;
      nome: string;
      dataNascita: string;
      exemptionCategoryNome: string | null;
    }[] = [];
    if (selectedCustomer) {
      ospiti.push({
        guestId: selectedCustomer.id,
        nome: `${selectedCustomer.cognome} ${selectedCustomer.nome}`,
        dataNascita: selectedCustomer.dataNascita,
        exemptionCategoryNome:
          guestExemptionOverrides[selectedCustomer.id] || null,
      });
    }
    accompanyingGuests.forEach((ag) => {
      ospiti.push({
        guestId: ag.id,
        nome: `${ag.cognome} ${ag.nome}`,
        dataNascita: ag.dataNascita,
        exemptionCategoryNome: guestExemptionOverrides[ag.id] || null,
      });
    });
    if (ospiti.length === 0) {
      setTouristTaxResult(null);
      setTouristTaxError("");
      return;
    }
    const timer = setTimeout(() => {
      setTouristTaxLoading(true);
      setTouristTaxError("");
      apiFetch("/api/tourist-tax/preview", {
        method: "POST",
        body: JSON.stringify({
          checkIn: newResCheckIn,
          checkOut: newResCheckOut,
          ospiti,
        }),
      })
        .then(async (res) => {
          if (res.status === 409) {
            const data = await res.json().catch(() => null);
            throw new Error(
              data?.message ||
                "Configurazione tassa di soggiorno non impostata per questa struttura",
            );
          }
          if (!res.ok)
            throw new Error("Impossibile calcolare la tassa di soggiorno");
          setTouristTaxResult(await res.json());
        })
        .catch((err) => setTouristTaxError(err.message))
        .finally(() => setTouristTaxLoading(false));
    }, 400);
    return () =>
      clearTimeout(
        timer,
      ); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [
    showReservationModal,
    newResCheckIn,
    newResCheckOut,
    newResSource,
    selectedCustomer,
    accompanyingGuests,
    guestExemptionOverrides,
  ]);
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.name
      .toLowerCase()
      .includes(roomSearchQuery.toLowerCase());
    const matchesType =
      roomTypeFilter === "ALL" || room.type === roomTypeFilter;
    return matchesSearch && matchesType;
  });
  if (publicCheckinMatch)
    return <PublicCheckinPage token={publicCheckinMatch[1]} />;
  if (pathname === "/reset-password" && resetPasswordToken)
    return <ResetPasswordPage token={resetPasswordToken} />;
  if (pathname === "/accept-invite" && acceptInviteToken)
    return <AcceptInvitePage token={acceptInviteToken} />;
  if (!user) {
    return <Login onSuccess={handleAuthSuccess} />;
  }
  return (
    <div className="min-h-screen bg-cosmic bg-grid text-slate-800 flex flex-col font-sans relative overflow-hidden">
      {" "}
      {/* Background soft lighting glows */}{" "}
      <div className="glow-orb w-[600px] h-[600px] bg-primary-500/10 top-[-200px] left-[-200px]" />{" "}
      <div className="glow-orb w-[700px] h-[700px] bg-accent-500/8 bottom-[-200px] right-[-200px]" />{" "}
      {/* Luminous Header NavBar */}{" "}
      <header className="bg-white/70 border-b border-slate-200/50 sticky top-0 z-40 backdrop-blur select-none">
        {" "}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-20 py-3 flex flex-wrap justify-between items-center gap-y-2">
          {" "}
          <div className="flex items-center gap-3">
            {" "}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-500 to-accent-500 p-[1.5px] shadow-sm shadow-accent-500/5 flex-shrink-0">
              {" "}
              <div className="w-full h-full bg-white rounded-[9px] flex items-center justify-center">
                {" "}
                <Hotel className="w-5 h-5 text-accent-500" />{" "}
              </div>{" "}
            </div>{" "}
            <div>
              {" "}
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                GlancePMS
              </h1>{" "}
              {/* Structure switcher */}{" "}
              <div className="relative mt-0.5">
                {" "}
                <button
                  onClick={() => setShowTenantSwitcher((s) => !s)}
                  className="flex items-center gap-1 text-[10px] text-accent-600 font-bold uppercase tracking-wider hover:text-accent-500 transition-colors cursor-pointer"
                >
                  {" "}
                  <span className="max-w-[140px] truncate">
                    {user.tenantName || "Struttura"}
                  </span>{" "}
                  <ChevronDown className="w-3 h-3 flex-shrink-0" />{" "}
                </button>{" "}
                {showTenantSwitcher && (
                  <div
                    className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200/70 shadow-xl z-50 overflow-hidden animate-fade-in"
                    onMouseLeave={() => setShowTenantSwitcher(false)}
                  >
                    {" "}
                    <div className="p-2">
                      {" "}
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1.5">
                        Le tue strutture
                      </p>{" "}
                      {userTenants.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setShowTenantSwitcher(false);
                            if (String(t.id) !== user.tenantId)
                              handleSwitchTenant(t.id);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${String(t.id) === user.tenantId ? "bg-accent-500/10 text-accent-600" : "text-slate-700 hover:bg-slate-50"}`}
                        >
                          {" "}
                          <Hotel className="w-3.5 h-3.5 flex-shrink-0" />{" "}
                          <span className="truncate">{t.businessName}</span>{" "}
                          {String(t.id) === user.tenantId && (
                            <span className="ml-auto text-[9px] text-accent-500 font-bold">
                              ATTIVA
                            </span>
                          )}{" "}
                        </button>
                      ))}{" "}
                    </div>{" "}
                    <div className="border-t border-slate-100 p-2">
                      {" "}
                      {userTenants.length < user.maxProperties ? (
                        <button
                          onClick={() => {
                            setShowTenantSwitcher(false);
                            setShowAddTenantModal(true);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-accent-600 hover:bg-accent-500/10 transition-all cursor-pointer flex items-center gap-2"
                        >
                          {" "}
                          <Plus className="w-3.5 h-3.5" /> Aggiungi
                          struttura{" "}
                        </button>
                      ) : (
                        <p className="text-[10px] text-slate-400 text-center px-2 py-1.5 font-medium">
                          {" "}
                          Limite di {user.maxProperties} strutture
                          raggiunto{" "}
                        </p>
                      )}{" "}
                    </div>{" "}
                  </div>
                )}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {" "}
            {user.subscriptionStatus === "TRIALING" && (
              <span className="hidden md:inline-block px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-xs font-semibold text-accent-600 tracking-wide uppercase text-[9px]">
                {" "}
                Prova Gratuita{" "}
              </span>
            )}{" "}
            {user.subscriptionStatus === "EXPIRED" && (
              <span className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-500 tracking-wide uppercase text-[9px]">
                {" "}
                PROVA SCADUTA{" "}
              </span>
            )}{" "}
            {[
              {
                key: "calendar" as const,
                label: "Calendario",
                icon: CalendarRange,
              },
              { key: "rooms" as const, label: "Camere", icon: Settings },
              { key: "customers" as const, label: "Clienti", icon: Users },
              { key: "stats" as const, label: "Statistiche", icon: Sparkles },
              {
                key: "touristTaxReport" as const,
                label: "Tassa Soggiorno",
                icon: Receipt,
              },
            ].map(({ key, label, icon: Icon }) => {
              const active = view === key;
              return (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${active ? "bg-accent-500 hover:bg-accent-600 text-white border-accent-600/10 shadow-md" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200/70"}`}
                >
                  {" "}
                  <Icon
                    className={`w-4 h-4 ${active ? "" : "text-slate-500"}`}
                  />{" "}
                  {label}{" "}
                </button>
              );
            })}{" "}
            {/* Impostazioni dropdown: raggruppa Compliance e Tassa di Soggiorno per non affollare la barra */}{" "}
            <div className="relative">
              {" "}
              <button
                onClick={() => setShowSettingsMenu((m) => !m)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/70 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {" "}
                <Settings className="w-4 h-4 text-accent-500" /> Impostazioni{" "}
                <ChevronDown className="w-3 h-3 text-slate-400" />{" "}
              </button>{" "}
              {showSettingsMenu && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200/70 shadow-xl z-50 overflow-hidden animate-fade-in"
                  onMouseLeave={() => setShowSettingsMenu(false)}
                >
                  {" "}
                  <div className="p-2">
                    {" "}
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false);
                        setShowRoomTypesModal(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-2"
                    >
                      {" "}
                      <BedDouble className="w-3.5 h-3.5 text-accent-500" />{" "}
                      Tipologie & Tariffe Camere{" "}
                    </button>{" "}
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false);
                        setShowTouristTaxSettingsModal(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-2"
                    >
                      {" "}
                      <Coins className="w-3.5 h-3.5 text-accent-500" /> Tassa di
                      Soggiorno{" "}
                    </button>{" "}
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false);
                        setShowComplianceModal(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-2"
                    >
                      {" "}
                      <ShieldCheck className="w-3.5 h-3.5 text-accent-500" />{" "}
                      Compliance & ISTAT{" "}
                    </button>{" "}
                  </div>{" "}
                </div>
              )}{" "}
            </div>{" "}
            {/* User menu */}{" "}
            <div className="relative">
              {" "}
              <button
                onClick={() => setShowUserMenu((m) => !m)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200/70 shadow-sm hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
              >
                {" "}
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-primary-500 to-accent-500 flex items-center justify-center text-white text-[10px] font-extrabold flex-shrink-0">
                  {" "}
                  {user.email[0].toUpperCase()}{" "}
                </div>{" "}
                <ChevronDown className="w-3 h-3 text-slate-400" />{" "}
              </button>{" "}
              {showUserMenu && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-slate-200/70 shadow-xl z-50 overflow-hidden animate-fade-in"
                  onMouseLeave={() => setShowUserMenu(false)}
                >
                  {" "}
                  <div className="p-2">
                    {" "}
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1.5 truncate">
                      {user.email}
                    </p>{" "}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowProfileModal(true);
                        setProfileSuccess(false);
                        setProfileError("");
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-2"
                    >
                      {" "}
                      <User className="w-3.5 h-3.5 text-slate-400" />{" "}
                      Profilo{" "}
                    </button>{" "}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowTeamModal(true);
                        fetchTeam();
                        setInviteMessage("");
                        setInviteError("");
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-2"
                    >
                      {" "}
                      <Users className="w-3.5 h-3.5 text-slate-400" /> Team{" "}
                    </button>{" "}
                  </div>{" "}
                  <div className="border-t border-slate-100 p-2">
                    {" "}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-all cursor-pointer flex items-center gap-2"
                    >
                      {" "}
                      <LogOut className="w-3.5 h-3.5" /> Esci{" "}
                    </button>{" "}
                  </div>{" "}
                </div>
              )}{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </header>{" "}
      {/* Main Workspace */}{" "}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative z-10 flex flex-col">
        {" "}
        {appError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-2xl text-sm mb-6 flex justify-between items-center font-medium">
            {" "}
            <span>{appError}</span>{" "}
            <button
              onClick={() => setAppError("")}
              className="text-red-500 hover:text-red-600"
            >
              {" "}
              <X className="w-4 h-4" />{" "}
            </button>{" "}
          </div>
        )}{" "}
        {view === "customers" && (
          <div className="flex-grow flex flex-col relative z-10 animate-fade-in">
            {" "}
            <CustomersPage />{" "}
          </div>
        )}{" "}
        {view === "stats" && (
          <div className="flex-grow flex flex-col relative z-10 animate-fade-in">
            {" "}
            <StatisticsPage reservations={reservations} rooms={rooms} />{" "}
          </div>
        )}{" "}
        {view === "touristTaxReport" && (
          <div className="flex-grow flex flex-col relative z-10 animate-fade-in">
            {" "}
            <TouristTaxReportPage />{" "}
          </div>
        )}{" "}
        {view !== "customers" &&
          view !== "stats" &&
          view !== "touristTaxReport" &&
          (view === "calendar" ? (
            <>
              {" "}
              {/* Dashboard Grid Header */}{" "}
              <div className="flex justify-between items-center mb-6 select-none">
                {" "}
                <div>
                  {" "}
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
                    Pianificazione Prenotazioni
                  </h2>{" "}
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
                    Trascina e rilascia le prenotazioni per riprogrammare le
                    date
                  </p>{" "}
                </div>{" "}
                <button
                  onClick={() => {
                    setActiveResTab("soggiorno");
                    setShowReservationModal(true);
                  }}
                  disabled={user.subscriptionStatus === "EXPIRED"}
                  className="btn-glow-primary px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:scale-100 active:scale-95 cursor-pointer"
                >
                  {" "}
                  <Plus className="w-5 h-5" /> Nuova Prenotazione{" "}
                </button>{" "}
              </div>{" "}
              {/* The Custom Visual Calendar */}{" "}
              <div className="flex-grow">
                {" "}
                <PlanningGrid
                  rooms={rooms}
                  reservations={reservations}
                  onRefresh={fetchData}
                  subscriptionStatus={user.subscriptionStatus}
                  onReservationClick={handleReservationClick}
                  /* Inject click callback */ onCellClick={handleCellClick}
                />{" "}
              </div>{" "}
            </>
          ) : (
            /* Dedicated Rooms Page */ <div className="flex-grow flex flex-col relative z-10 animate-fade-in">
              {" "}
              {/* Header */}{" "}
              <div className="flex flex-wrap justify-between items-center mb-6 gap-4 select-none">
                {" "}
                <div>
                  {" "}
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
                    Gestione Camere
                  </h2>{" "}
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
                    {" "}
                    Visualizza, filtra e gestisci le camere della struttura{" "}
                  </p>{" "}
                </div>{" "}
                <button
                  onClick={() => {
                    setSelectedRoomForEdit(null);
                    setShowAddRoomModal(true);
                    setShowRoomTypesPanel(false);
                    setNewRoomName("");
                    setNewRoomType("");
                    setNewRoomCapacity(2);
                  }}
                  className="btn-glow-primary px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  {" "}
                  <Plus className="w-4 h-4" /> Nuova Camera{" "}
                </button>{" "}
              </div>{" "}
              {/* Search and filter bar */}{" "}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                {" "}
                <div className="relative flex-1">
                  {" "}
                  <input
                    type="text"
                    value={roomSearchQuery}
                    onChange={(e) => setRoomSearchQuery(e.target.value)}
                    className="glass-input block w-full px-3.5 py-2.5 rounded-xl text-slate-900 text-xs focus:outline-none"
                    placeholder="Cerca camera per nome..."
                  />{" "}
                </div>{" "}
                <select
                  value={roomTypeFilter}
                  onChange={(e) => setRoomTypeFilter(e.target.value)}
                  className="glass-input px-3 py-2.5 rounded-xl text-slate-900 text-xs focus:outline-none bg-white sm:w-48"
                >
                  {" "}
                  <option value="ALL">Tutte le tipologie</option>{" "}
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.name}>
                      {rt.name}
                    </option>
                  ))}{" "}
                </select>{" "}
              </div>{" "}
              {/* Rooms Table */}{" "}
              <div className="bg-white/60 backdrop-blur rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden">
                {" "}
                {filteredRooms.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 font-medium text-sm">
                    {" "}
                    Nessuna camera corrisponde ai filtri selezionati.{" "}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    {" "}
                    <thead>
                      {" "}
                      <tr className="border-b border-slate-200/60 bg-slate-50/80">
                        {" "}
                        <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Camera
                        </th>{" "}
                        <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                          Tipologia
                        </th>{" "}
                        <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                          Ospiti
                        </th>{" "}
                        <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                          iCal
                        </th>{" "}
                        <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                          Prezzo/notte
                        </th>{" "}
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                          Azioni
                        </th>{" "}
                      </tr>{" "}
                    </thead>{" "}
                    <tbody className="divide-y divide-slate-100">
                      {" "}
                      {filteredRooms.map((room) => (
                        <tr
                          key={room.id}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          {" "}
                          <td className="px-4 py-3.5">
                            {" "}
                            <span className="font-bold text-slate-900 text-sm">
                              {room.name}
                            </span>{" "}
                            <div className="sm:hidden mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              {" "}
                              <span className="text-[10px] text-accent-500 font-bold uppercase tracking-wide">
                                {room.type}
                              </span>{" "}
                              <span className="text-[10px] text-slate-400">
                                {room.capacity}{" "}
                                {room.capacity === 1 ? "ospite" : "ospiti"}
                              </span>{" "}
                              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                {" "}
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />{" "}
                                iCal{" "}
                              </span>{" "}
                            </div>{" "}
                          </td>{" "}
                          <td className="px-4 py-3.5 hidden sm:table-cell">
                            {" "}
                            <span className="text-xs font-semibold text-accent-500 uppercase tracking-wide">
                              {room.type}
                            </span>{" "}
                          </td>{" "}
                          <td className="px-4 py-3.5 hidden sm:table-cell">
                            {" "}
                            <span className="text-xs text-slate-600">
                              {room.capacity}{" "}
                              {room.capacity === 1 ? "ospite" : "ospiti"}
                            </span>{" "}
                          </td>{" "}
                          <td className="px-4 py-3.5 hidden md:table-cell">
                            {" "}
                            <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                              {" "}
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />{" "}
                              Attiva{" "}
                            </span>{" "}
                          </td>{" "}
                          <td className="px-4 py-3.5 hidden sm:table-cell text-right">
                            {" "}
                            {(() => {
                              const rt = roomTypes.find(
                                (t) => t.name === room.type,
                              );
                              return rt?.prezzoNotte != null ? (
                                <span className="text-xs font-semibold text-slate-700">
                                  â‚¬ {rt.prezzoNotte.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  â€”
                                </span>
                              );
                            })()}{" "}
                          </td>{" "}
                          <td className="px-4 py-3.5">
                            {" "}
                            <div className="flex items-center justify-end gap-1.5">
                              {" "}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIcalRoomId(room.id);
                                  setShowIcalModal(true);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-accent-600 bg-accent-500/10 hover:bg-accent-500 hover:text-white transition-all cursor-pointer whitespace-nowrap"
                                title="Gestisci canali iCal"
                              >
                                {" "}
                                <Globe className="w-3.5 h-3.5 flex-shrink-0" />{" "}
                                <span className="hidden sm:inline">
                                  iCal
                                </span>{" "}
                              </button>{" "}
                              <button
                                type="button"
                                onClick={() => handleEditRoomClick(room)}
                                className="p-1.5 rounded-lg text-slate-300 hover:text-accent-500 hover:bg-accent-500/10 transition-all cursor-pointer"
                                title="Modifica camera"
                              >
                                {" "}
                                <Pencil className="w-4 h-4" />{" "}
                              </button>{" "}
                              <button
                                type="button"
                                onClick={() => handleDeleteRoom(room.id)}
                                className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                                title="Elimina camera"
                              >
                                {" "}
                                <Trash2 className="w-4 h-4" />{" "}
                              </button>{" "}
                            </div>{" "}
                          </td>{" "}
                        </tr>
                      ))}{" "}
                    </tbody>{" "}
                  </table>
                )}{" "}
              </div>{" "}
            </div>
          ))}{" "}
      </main>{" "}
      {/* Overlay: Abbonamento scaduto */}{" "}
      {(subscriptionExpired || user.subscriptionStatus === "EXPIRED") &&
        (() => {
          const plans = [
            {
              key: "STARTER",
              label: "Starter",
              monthly: 14,
              yearly: 134,
              props: 5,
              desc: "fino a 5 strutture",
            },
            {
              key: "PRO",
              label: "Pro",
              monthly: 25,
              yearly: 240,
              props: 999,
              desc: "strutture illimitate",
              popular: true,
            },
          ];
          const [selectedPlan, setSelectedPlan] = React.useState("PRO");
          const [interval, setInterval] = React.useState<"month" | "year">(
            "month",
          );
          const [checkoutLoading, setCheckoutLoading] = React.useState(false);
          const handleSubscribe = async () => {
            setCheckoutLoading(true);
            try {
              const res = await apiFetch("/api/billing/checkout", {
                method: "POST",
                body: JSON.stringify({ plan: selectedPlan, interval }),
              });
              if (!res.ok) throw new Error("Errore");
              const data = await res.json();
              window.location.href = data.url;
            } catch (_) {
              setCheckoutLoading(false);
            }
          };
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
              {" "}
              <div className="gradient-border-wrapper w-full max-w-lg animate-fade-in my-4">
                {" "}
                <div className="glass-panel px-6 py-8 bg-white/97">
                  {" "}
                  <div className="text-center mb-6">
                    {" "}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-500 to-accent-500 p-[1.5px] shadow-lg mx-auto mb-4">
                      {" "}
                      <div className="w-full h-full bg-white rounded-[20px] flex items-center justify-center">
                        {" "}
                        <Hotel className="w-7 h-7 text-accent-500" />{" "}
                      </div>{" "}
                    </div>{" "}
                    <h2 className="text-xl font-extrabold text-slate-900">
                      Attiva il tuo piano
                    </h2>{" "}
                    <p className="text-sm text-slate-500 mt-1">
                      Il periodo di prova gratuita Ã¨ terminato. Scegli il piano
                      piÃ¹ adatto alla tua struttura.
                    </p>{" "}
                  </div>{" "}
                  {/* Interval toggle */}{" "}
                  <div className="flex items-center justify-center gap-2 mb-5">
                    {" "}
                    <button
                      onClick={() => setInterval("month")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${interval === "month" ? "bg-accent-500 text-white" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {" "}
                      Mensile{" "}
                    </button>{" "}
                    <button
                      onClick={() => setInterval("year")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${interval === "year" ? "bg-accent-500 text-white" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {" "}
                      Annuale{" "}
                      <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-extrabold">
                        -20%
                      </span>{" "}
                    </button>{" "}
                  </div>{" "}
                  {/* Plans */}{" "}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {" "}
                    {plans.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => setSelectedPlan(p.key)}
                        className={`relative p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${selectedPlan === p.key ? "border-accent-500 bg-accent-500/5" : "border-slate-200 hover:border-slate-300"}`}
                      >
                        {" "}
                        {p.popular && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-accent-500 text-white px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                            PiÃ¹ scelto
                          </span>
                        )}{" "}
                        <p className="text-xs font-bold text-slate-800">
                          {p.label}
                        </p>{" "}
                        <p className="text-lg font-extrabold text-slate-900 mt-1">
                          {" "}
                          â‚¬
                          {interval === "month"
                            ? p.monthly
                            : Math.round(p.yearly / 12)}{" "}
                          <span className="text-[10px] text-slate-400 font-medium">
                            /mese
                          </span>{" "}
                        </p>{" "}
                        {interval === "year" && (
                          <p className="text-[9px] text-emerald-600 font-bold">
                            â‚¬{p.yearly}/anno
                          </p>
                        )}{" "}
                        <p className="text-[10px] text-slate-400 mt-1">
                          {p.desc}
                        </p>{" "}
                      </button>
                    ))}{" "}
                  </div>{" "}
                  <button
                    onClick={handleSubscribe}
                    disabled={checkoutLoading}
                    className="btn-glow-primary w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-95 transition-all mb-3"
                  >
                    {" "}
                    {checkoutLoading
                      ? "Reindirizzamento..."
                      : "ðŸ”’ Procedi al pagamento sicuro"}{" "}
                  </button>{" "}
                  <div className="flex items-center justify-between">
                    {" "}
                    <button
                      onClick={handleLogout}
                      className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                    >
                      {" "}
                      Esci dall'account{" "}
                    </button>{" "}
                    <a
                      href="mailto:support@glancepms.it"
                      className="text-xs text-accent-600 font-semibold hover:underline"
                    >
                      {" "}
                      Serve aiuto?{" "}
                    </a>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </div>
          );
        })()}{" "}
      {/* Modal: Profilo (cambio password) */}{" "}
      {showProfileModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowProfileModal(false);
          }}
        >
          {" "}
          <div className="gradient-border-wrapper w-full max-w-sm animate-fade-in">
            {" "}
            <div className="glass-panel p-6 bg-white/95">
              {" "}
              <div className="flex justify-between items-center mb-6">
                {" "}
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  {" "}
                  <User className="w-4 h-4 text-accent-500" /> Profilo{" "}
                </h3>{" "}
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>{" "}
              </div>{" "}
              <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                {" "}
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Account
                </p>{" "}
                <p className="text-sm font-semibold text-slate-800">
                  {user.email}
                </p>{" "}
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Piano:{" "}
                  <span className="font-bold text-accent-600">
                    {user.planType}
                  </span>
                </p>{" "}
              </div>{" "}
              <p className="text-xs font-bold text-slate-600 mb-3">
                Cambia Password
              </p>{" "}
              {profileError && (
                <div className="mb-3 bg-red-500/10 border border-red-500/25 text-red-500 p-3 rounded-xl text-xs font-medium">
                  {profileError}
                </div>
              )}{" "}
              {profileSuccess && (
                <div className="mb-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 p-3 rounded-xl text-xs font-medium">
                  Password aggiornata con successo!
                </div>
              )}{" "}
              <form onSubmit={handleChangePassword} className="space-y-3">
                {" "}
                {[
                  ["Password attuale", oldPassword, setOldPassword],
                  ["Nuova password", newPassword, setNewPassword],
                  [
                    "Conferma nuova password",
                    confirmPassword,
                    setConfirmPassword,
                  ],
                ].map(([label, val, setter]) => (
                  <div key={label as string}>
                    {" "}
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {label as string}
                    </label>{" "}
                    <input
                      type="password"
                      required
                      value={val as string}
                      onChange={(e) => (setter as any)(e.target.value)}
                      className="glass-input block w-full px-3.5 py-2.5 rounded-xl text-slate-900 text-sm focus:outline-none"
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    />{" "}
                  </div>
                ))}{" "}
                <button
                  type="submit"
                  className="btn-glow-primary w-full py-3 rounded-xl text-white font-bold text-xs uppercase tracking-widest mt-2 cursor-pointer active:scale-95"
                >
                  {" "}
                  Aggiorna Password{" "}
                </button>{" "}
              </form>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Modal: Team */}{" "}
      {showTeamModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTeamModal(false);
          }}
        >
          {" "}
          <div className="gradient-border-wrapper w-full max-w-md animate-fade-in">
            {" "}
            <div className="glass-panel p-6 bg-white/95">
              {" "}
              <div className="flex justify-between items-center mb-5">
                {" "}
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  {" "}
                  <Users className="w-4 h-4 text-accent-500" /> Team â€”{" "}
                  {user.tenantName}{" "}
                </h3>{" "}
                <button
                  onClick={() => setShowTeamModal(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>{" "}
              </div>{" "}
              {/* Invite form */}{" "}
              <form onSubmit={handleInvite} className="flex gap-2 mb-2">
                {" "}
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="glass-input flex-1 px-3 py-2.5 rounded-xl text-slate-900 text-xs focus:outline-none"
                  placeholder="email@collaboratore.it"
                />{" "}
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="glass-input px-2 py-2.5 rounded-xl text-slate-900 text-xs focus:outline-none bg-white"
                >
                  {" "}
                  <option value="MANAGER">Manager</option>{" "}
                  <option value="OWNER">Owner</option>{" "}
                </select>{" "}
                <button
                  type="submit"
                  className="px-3 py-2.5 rounded-xl text-white font-bold bg-accent-500 hover:bg-accent-600 transition-all text-xs cursor-pointer flex-shrink-0"
                >
                  {" "}
                  <Plus className="w-4 h-4" />{" "}
                </button>{" "}
              </form>{" "}
              {inviteError && (
                <p className="text-xs text-red-500 font-medium mb-2">
                  {inviteError}
                </p>
              )}{" "}
              {inviteMessage && (
                <p className="text-xs text-emerald-600 font-medium mb-2">
                  {inviteMessage}
                </p>
              )}{" "}
              {/* Members list */}{" "}
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {" "}
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Membri attuali
                </p>{" "}
                {teamMembers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">
                    Nessun membro nel team
                  </p>
                ) : (
                  teamMembers.map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60"
                    >
                      {" "}
                      <div>
                        {" "}
                        <p className="text-xs font-semibold text-slate-800">
                          {m.email}
                        </p>{" "}
                        <p className="text-[10px] text-accent-500 font-bold uppercase tracking-wide">
                          {m.role}
                        </p>{" "}
                      </div>{" "}
                      {m.email !== user.email && (
                        <button
                          onClick={() => handleRemoveTeamMember(m.userId)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                        >
                          {" "}
                          <Trash2 className="w-3.5 h-3.5" />{" "}
                        </button>
                      )}{" "}
                    </div>
                  ))
                )}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Modal: Aggiungi Struttura */}{" "}
      {showAddTenantModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddTenantModal(false);
              setAddTenantError("");
            }
          }}
        >
          {" "}
          <div className="gradient-border-wrapper w-full max-w-sm animate-fade-in">
            {" "}
            <div className="glass-panel p-6 bg-white/95">
              {" "}
              <div className="flex justify-between items-center mb-6">
                {" "}
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  {" "}
                  <Hotel className="w-4 h-4 text-accent-500" /> Nuova
                  Struttura{" "}
                </h3>{" "}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTenantModal(false);
                    setAddTenantError("");
                  }}
                  className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {" "}
                  <X className="w-5 h-5" />{" "}
                </button>{" "}
              </div>{" "}
              {addTenantError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/25 text-red-500 p-3 rounded-xl text-xs font-medium">
                  {" "}
                  {addTenantError}{" "}
                </div>
              )}{" "}
              <form onSubmit={handleAddTenant} className="space-y-4">
                {" "}
                <div>
                  {" "}
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nome Struttura
                  </label>{" "}
                  <input
                    type="text"
                    required
                    value={newTenantName}
                    onChange={(e) => setNewTenantName(e.target.value)}
                    className="glass-input block w-full px-3.5 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                    placeholder="Es. B&B Il Girasole"
                    autoFocus
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Email di Contatto
                  </label>{" "}
                  <input
                    type="email"
                    required
                    value={newTenantEmail}
                    onChange={(e) => setNewTenantEmail(e.target.value)}
                    className="glass-input block w-full px-3.5 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                    placeholder="info@ilgirasole.it"
                  />{" "}
                </div>{" "}
                <div className="pt-1 space-y-2">
                  {" "}
                  <button
                    type="submit"
                    className="btn-glow-primary w-full flex justify-center py-3 px-4 rounded-xl text-white font-bold uppercase tracking-widest text-xs shadow-md cursor-pointer active:scale-95 transition-all"
                  >
                    {" "}
                    Crea e Passa alla Struttura{" "}
                  </button>{" "}
                  <p className="text-[10px] text-slate-400 text-center">
                    {" "}
                    {user.maxProperties - userTenants.length} slot disponibili
                    su {user.maxProperties} del tuo piano{" "}
                  </p>{" "}
                </div>{" "}
              </form>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Modal: Nuova/Modifica Camera */}{" "}
      {showAddRoomModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddRoomModal(false);
              setShowRoomTypesPanel(false);
              setSelectedRoomForEdit(null);
            }
          }}
        >
          {" "}
          <div className="gradient-border-wrapper w-full max-w-sm animate-fade-in">
            {" "}
            <div className="glass-panel p-6 bg-white/95">
              {" "}
              <div className="flex justify-between items-center mb-6">
                {" "}
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  {" "}
                  {selectedRoomForEdit ? (
                    <Pencil className="w-4 h-4 text-accent-500" />
                  ) : (
                    <Plus className="w-4 h-4 text-accent-500" />
                  )}{" "}
                  {selectedRoomForEdit
                    ? "Modifica Camera"
                    : "Nuova Camera"}{" "}
                </h3>{" "}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRoomModal(false);
                    setShowRoomTypesPanel(false);
                    setSelectedRoomForEdit(null);
                  }}
                  className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {" "}
                  <X className="w-5 h-5" />{" "}
                </button>{" "}
              </div>{" "}
              <form onSubmit={handleAddRoom} className="space-y-4">
                {" "}
                <div>
                  {" "}
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nome Camera
                  </label>{" "}
                  <input
                    type="text"
                    required
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="glass-input block w-full px-3.5 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                    placeholder="Es. Camera 101"
                    autoFocus
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Tipologia
                  </label>{" "}
                  <div className="flex gap-2 items-center">
                    {" "}
                    <select
                      required
                      value={newRoomType}
                      onChange={(e) => setNewRoomType(e.target.value)}
                      className="glass-input flex-1 px-3 py-3 rounded-xl text-slate-900 text-sm focus:outline-none bg-white"
                    >
                      {" "}
                      <option value="">Seleziona...</option>{" "}
                      {roomTypes.map((rt) => (
                        <option key={rt.id} value={rt.name}>
                          {rt.name}
                        </option>
                      ))}{" "}
                    </select>{" "}
                    <button
                      type="button"
                      onClick={() => setShowRoomTypesModal(true)}
                      className="p-3 rounded-xl border bg-white text-slate-500 border-slate-200 hover:border-accent-400 hover:text-accent-500 transition-all cursor-pointer flex-shrink-0"
                      title="Gestisci tipologie"
                    >
                      {" "}
                      <Settings className="w-4 h-4" />{" "}
                    </button>{" "}
                  </div>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    CapacitÃ  Ospiti
                  </label>{" "}
                  <input
                    type="number"
                    min="1"
                    required
                    value={newRoomCapacity}
                    onChange={(e) =>
                      setNewRoomCapacity(parseInt(e.target.value))
                    }
                    className="glass-input block w-full px-3.5 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                  />{" "}
                </div>{" "}
                <button
                  type="submit"
                  className="btn-glow-primary w-full flex justify-center py-3 px-4 rounded-xl text-white font-bold uppercase tracking-widest text-xs shadow-md cursor-pointer active:scale-95 transition-all mt-2"
                >
                  {" "}
                  {selectedRoomForEdit ? "Salva Modifiche" : "Crea Camera"}{" "}
                </button>{" "}
              </form>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Modal: Gestione Tipologie Camera */}{" "}
      {showRoomTypesModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRoomTypesModal(false);
              setEditingRoomTypeId(null);
            }
          }}
        >
          {" "}
          <div className="gradient-border-wrapper w-full max-w-sm animate-fade-in">
            {" "}
            <div className="glass-panel p-6 bg-white/95">
              {" "}
              <div className="flex justify-between items-center mb-5">
                {" "}
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  {" "}
                  <Settings className="w-4 h-4 text-accent-500" /> Tipologie
                  Camera{" "}
                </h3>{" "}
                <button
                  type="button"
                  onClick={() => {
                    setShowRoomTypesModal(false);
                    setEditingRoomTypeId(null);
                  }}
                  className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {" "}
                  <X className="w-5 h-5" />{" "}
                </button>{" "}
              </div>{" "}
              {/* Aggiungi nuova tipologia */}{" "}
              <form onSubmit={handleAddRoomType} className="flex gap-2 mb-4">
                {" "}
                <input
                  type="text"
                  required
                  value={newRoomTypeName}
                  onChange={(e) => setNewRoomTypeName(e.target.value)}
                  className="glass-input flex-1 px-3 py-2.5 rounded-xl text-slate-900 text-sm focus:outline-none"
                  placeholder="Nuova tipologia..."
                />{" "}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newRoomTypePrice}
                  onChange={(e) => setNewRoomTypePrice(e.target.value)}
                  className="glass-input w-24 px-3 py-2.5 rounded-xl text-slate-900 text-sm focus:outline-none"
                  placeholder="â‚¬/notte"
                />{" "}
                <button
                  type="submit"
                  className="px-3 py-2.5 rounded-xl text-white font-bold bg-accent-500 hover:bg-accent-600 transition-all flex items-center justify-center cursor-pointer shadow-md"
                >
                  {" "}
                  <Plus className="w-4 h-4" />{" "}
                </button>{" "}
              </form>{" "}
              {/* Lista tipologie */}{" "}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {" "}
                {roomTypes.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Nessuna tipologia registrata.
                  </p>
                ) : (
                  roomTypes.map((rt) => (
                    <div
                      key={rt.id}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60"
                    >
                      {" "}
                      <span className="flex-1 text-sm font-semibold text-slate-800">
                        {rt.name}
                      </span>{" "}
                      <span className="text-xs font-semibold text-slate-500">
                        {" "}
                        {rt.prezzoNotte != null
                          ? `â‚¬ ${rt.prezzoNotte.toFixed(2)}/notte`
                          : "â€”"}{" "}
                      </span>{" "}
                      <button
                        type="button"
                        onClick={() => openRoomRatesModal(rt)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-accent-500 hover:bg-accent-500/10 transition-all cursor-pointer flex-shrink-0"
                        title="Tariffe stagionali"
                      >
                        {" "}
                        <CalendarRange className="w-3.5 h-3.5" />{" "}
                      </button>{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRoomTypeId(rt.id);
                          setEditingRoomTypeName(rt.name);
                          setEditingRoomTypePrice(
                            rt.prezzoNotte != null
                              ? String(rt.prezzoNotte)
                              : "",
                          );
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-accent-500 hover:bg-accent-500/10 transition-all cursor-pointer flex-shrink-0"
                        title="Modifica"
                      >
                        {" "}
                        <Pencil className="w-3.5 h-3.5" />{" "}
                      </button>{" "}
                      <button
                        type="button"
                        onClick={() => handleDeleteRoomType(rt.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer flex-shrink-0"
                        title="Elimina"
                      >
                        {" "}
                        <Trash2 className="w-3.5 h-3.5" />{" "}
                      </button>{" "}
                    </div>
                  ))
                )}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Modal: Modifica Tipologia Camera */}{" "}
      {editingRoomTypeId !== null && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingRoomTypeId(null);
          }}
        >
          {" "}
          <div className="gradient-border-wrapper w-full max-w-sm animate-fade-in">
            {" "}
            <div className="glass-panel p-6 bg-white/95">
              {" "}
              <div className="flex justify-between items-center mb-6">
                {" "}
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  {" "}
                  <Pencil className="w-4 h-4 text-accent-500" /> Modifica
                  Tipologia{" "}
                </h3>{" "}
                <button
                  type="button"
                  onClick={() => setEditingRoomTypeId(null)}
                  className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {" "}
                  <X className="w-5 h-5" />{" "}
                </button>{" "}
              </div>{" "}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingRoomTypeId !== null)
                    handleUpdateRoomType(
                      editingRoomTypeId,
                      editingRoomTypeName,
                      editingRoomTypePrice,
                    );
                }}
                className="space-y-4"
              >
                {" "}
                <div>
                  {" "}
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nome Tipologia
                  </label>{" "}
                  <input
                    type="text"
                    required
                    value={editingRoomTypeName}
                    onChange={(e) => setEditingRoomTypeName(e.target.value)}
                    className="glass-input block w-full px-3.5 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                    autoFocus
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Prezzo per notte (â‚¬)
                  </label>{" "}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingRoomTypePrice}
                    onChange={(e) => setEditingRoomTypePrice(e.target.value)}
                    className="glass-input block w-full px-3.5 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                    placeholder="â‚¬/notte"
                  />{" "}
                </div>{" "}
                <button
                  type="submit"
                  className="btn-glow-primary w-full flex justify-center py-3 px-4 rounded-xl text-white font-bold uppercase tracking-widest text-xs shadow-md cursor-pointer active:scale-95 transition-all mt-2"
                >
                  {" "}
                  Salva Modifiche{" "}
                </button>{" "}
              </form>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Modal: Tariffe Stagionali (per tipologia camera) */}{" "}
      {ratesForRoomType &&
        (() => {
          /* "Old" = ended more than 3 months ago: tucked away in a collapsed archive so the list */ /* doesn't accumulate a decade of dead periods. "Concluded" = ended, but recently enough */ /* to still be relevant (e.g. a season that just ended) â€” stays in place, just labeled. */ const todayIso =
            new Date().toISOString().slice(0, 10);
          const graceCutoffDate = new Date();
          graceCutoffDate.setMonth(graceCutoffDate.getMonth() - 3);
          const graceCutoffIso = graceCutoffDate.toISOString().slice(0, 10);
          const isOld = (rate: RoomTypeRate) => rate.dataFine < graceCutoffIso;
          const isConcluded = (rate: RoomTypeRate) =>
            !isOld(rate) && rate.dataFine < todayIso;
          const searching = rateSearchQuery.trim() !== "";
          const recurringRules = roomTypeRates.filter((r) => r.ricorrente);
          const exceptionsByParent = new Map<number, RoomTypeRate[]>();
          roomTypeRates.forEach((r) => {
            if (!r.ricorrente && r.parentRateId != null) {
              exceptionsByParent.set(r.parentRateId, [
                ...(exceptionsByParent.get(r.parentRateId) || []),
                r,
              ]);
            }
          });
          const oneOffs = roomTypeRates.filter(
            (r) => !r.ricorrente && r.parentRateId == null,
          );
          const recurringGroups = recurringRules
            .map((rule) => {
              const allExceptions = exceptionsByParent.get(rule.id) || [];
              const shownExceptions = searching
                ? allExceptions
                : allExceptions.filter((exc) => !isOld(exc));
              const ruleMatches = rateMatchesSearch(rule, rateSearchQuery);
              const visibleExceptions = shownExceptions.filter(
                (exc) => ruleMatches || rateMatchesSearch(exc, rateSearchQuery),
              );
              return {
                rule,
                exceptions: visibleExceptions,
                show: ruleMatches || visibleExceptions.length > 0,
              };
            })
            .filter((g) => g.show);
          const visibleOneOffs = (
            searching ? oneOffs : oneOffs.filter((r) => !isOld(r))
          ).filter((r) => rateMatchesSearch(r, rateSearchQuery));
          const pastItems: Array<{
            rate: RoomTypeRate;
            parentLabel: string | null;
          }> = [];
          if (!searching) {
            oneOffs
              .filter(isOld)
              .forEach((r) => pastItems.push({ rate: r, parentLabel: null }));
            exceptionsByParent.forEach((list, parentId) => {
              const parent = roomTypeRates.find((r) => r.id === parentId);
              list.filter(isOld).forEach((exc) =>
                pastItems.push({
                  rate: exc,
                  parentLabel: parent
                    ? formatRecurringRange(parent.dataInizio, parent.dataFine)
                    : null,
                }),
              );
            });
          }
          const isEmpty = roomTypeRates.length === 0;
          const noSearchResults =
            !isEmpty &&
            searching &&
            recurringGroups.length === 0 &&
            visibleOneOffs.length === 0;
          const parentForException =
            newRateParentId !== null
              ? roomTypeRates.find((r) => r.id === newRateParentId)
              : undefined;
          const formTitle =
            editingRateId !== null
              ? "Modifica periodo"
              : parentForException
                ? "Nuova eccezione"
                : "Nuovo periodo";
          return (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setRatesForRoomType(null);
                  cancelEditRate();
                }
              }}
            >
              {" "}
              <div className="gradient-border-wrapper w-full max-w-2xl animate-fade-in">
                {" "}
                <div className="glass-panel p-6 bg-white/95 max-h-[85vh] flex flex-col">
                  {" "}
                  <div className="flex justify-between items-center mb-3 flex-shrink-0">
                    {" "}
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      {" "}
                      <CalendarRange className="w-4 h-4 text-accent-500" />{" "}
                      Tariffe Stagionali{" "}
                    </h3>{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setRatesForRoomType(null);
                        cancelEditRate();
                      }}
                      className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      {" "}
                      <X className="w-5 h-5" />{" "}
                    </button>{" "}
                  </div>{" "}
                  <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                    {" "}
                    <span className="px-2.5 py-1 rounded-lg bg-accent-500/10 text-accent-600 text-xs font-extrabold">
                      {ratesForRoomType.name}
                    </span>{" "}
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {" "}
                      {ratesForRoomType.prezzoNotte != null ? (
                        <>
                          Base{" "}
                          <span className="font-bold text-slate-500">
                            â‚¬ {ratesForRoomType.prezzoNotte.toFixed(2)}/notte
                          </span>
                          , valida fuori dai periodi qui sotto.
                        </>
                      ) : (
                        "Nessuna tariffa base: impostala prima, poi aggiungi qui i periodi con prezzi diversi."
                      )}{" "}
                    </p>{" "}
                  </div>{" "}
                  {/* Aggiungi/Modifica periodo */}{" "}
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 mb-4 flex-shrink-0">
                    {" "}
                    <div className="flex items-center justify-between mb-2.5">
                      {" "}
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {formTitle}
                      </h4>{" "}
                      {(editingRateId !== null || parentForException) && (
                        <button
                          type="button"
                          onClick={cancelEditRate}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          {" "}
                          Annulla{" "}
                        </button>
                      )}{" "}
                    </div>{" "}
                    {parentForException && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/70 rounded-lg px-2.5 py-1.5 mb-2.5 flex items-center gap-1.5">
                        {" "}
                        <CalendarPlus className="w-3.5 h-3.5 flex-shrink-0" />{" "}
                        Eccezione per{" "}
                        <span className="font-bold">
                          {formatRecurringRange(
                            parentForException.dataInizio,
                            parentForException.dataFine,
                          )}
                        </span>
                        , valida solo per l'anno scelto qui sotto.{" "}
                      </p>
                    )}{" "}
                    <form onSubmit={handleSaveRate} className="space-y-2.5">
                      {" "}
                      <div className="grid grid-cols-3 gap-2">
                        {" "}
                        <div>
                          {" "}
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Dal
                          </label>{" "}
                          <input
                            type="date"
                            required
                            value={newRateStart}
                            onChange={(e) => setNewRateStart(e.target.value)}
                            className="glass-input block w-full px-2.5 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                          />{" "}
                        </div>{" "}
                        <div>
                          {" "}
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Al
                          </label>{" "}
                          <input
                            type="date"
                            required
                            value={newRateEnd}
                            onChange={(e) => setNewRateEnd(e.target.value)}
                            className="glass-input block w-full px-2.5 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                          />{" "}
                        </div>{" "}
                        <div>
                          {" "}
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            â‚¬/notte
                          </label>{" "}
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={newRatePrice}
                            onChange={(e) => setNewRatePrice(e.target.value)}
                            placeholder="Es. 120.00"
                            className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                          />{" "}
                        </div>{" "}
                      </div>{" "}
                      {!parentForException && (
                        <div>
                          {" "}
                          <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                            {" "}
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={newRateRicorrente}
                              onChange={(e) =>
                                setNewRateRicorrente(e.target.checked)
                              }
                            />{" "}
                            <span className="w-9 h-5 rounded-full bg-slate-300 peer-checked:bg-accent-500 transition-colors relative flex-shrink-0">
                              {" "}
                              <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />{" "}
                            </span>{" "}
                            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                              {" "}
                              <Repeat className="w-3 h-3" /> Ripeti ogni
                              anno{" "}
                            </span>{" "}
                          </label>{" "}
                          {newRateRicorrente && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              L'anno indicato non conta: la regola si
                              applicherÃ  a queste date ogni anno, finchÃ© non
                              la elimini.
                            </p>
                          )}{" "}
                        </div>
                      )}{" "}
                      <button
                        type="submit"
                        className="btn-glow-primary w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-white font-bold uppercase tracking-widest text-[10px] shadow-md cursor-pointer active:scale-95 transition-all mt-1"
                      >
                        {" "}
                        {editingRateId !== null ? (
                          <>
                            <Save className="w-3.5 h-3.5" /> Salva Modifiche
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />{" "}
                            {parentForException
                              ? "Aggiungi Eccezione"
                              : "Aggiungi Periodo"}
                          </>
                        )}{" "}
                      </button>{" "}
                    </form>{" "}
                  </div>{" "}
                  {/* Ricerca */}{" "}
                  {!isEmpty && (
                    <div className="relative mb-3 flex-shrink-0">
                      {" "}
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />{" "}
                      <input
                        type="text"
                        value={rateSearchQuery}
                        onChange={(e) => setRateSearchQuery(e.target.value)}
                        placeholder="Cerca per mese, anno o prezzo..."
                        className="glass-input block w-full pl-9 pr-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                      />{" "}
                    </div>
                  )}{" "}
                  {/* Lista periodi */}{" "}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">
                    {" "}
                    {ratesLoading ? (
                      <p className="text-xs text-slate-400 text-center py-4">
                        Caricamento...
                      </p>
                    ) : isEmpty ? (
                      <div className="text-center py-6">
                        {" "}
                        <CalendarRange className="w-7 h-7 text-slate-300 mx-auto mb-2" />{" "}
                        <p className="text-xs text-slate-400">
                          Nessun periodo stagionale impostato.
                          <br />
                          Il prezzo base si applica sempre.
                        </p>{" "}
                      </div>
                    ) : noSearchResults ? (
                      <p className="text-xs text-slate-400 text-center py-4">
                        Nessun periodo trovato per "{rateSearchQuery}".
                      </p>
                    ) : (
                      <>
                        {" "}
                        {recurringGroups.length > 0 && (
                          <div>
                            {" "}
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                              Regole ricorrenti
                            </p>{" "}
                            <div className="space-y-2">
                              {" "}
                              {recurringGroups.map(({ rule, exceptions }) => (
                                <div key={rule.id} className="space-y-1.5">
                                  {" "}
                                  <div
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${editingRateId === rule.id ? "bg-accent-500/5 border-accent-400 ring-1 ring-accent-400/40" : "bg-white border-slate-200/60"}`}
                                  >
                                    {" "}
                                    <div className="w-8 h-8 rounded-full bg-accent-500/10 text-accent-500 flex items-center justify-center flex-shrink-0">
                                      {" "}
                                      <Repeat className="w-4 h-4" />{" "}
                                    </div>{" "}
                                    <div className="flex-1 min-w-0">
                                      {" "}
                                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                        {" "}
                                        {formatRecurringRange(
                                          rule.dataInizio,
                                          rule.dataFine,
                                        )}{" "}
                                        <span className="px-1.5 py-0.5 rounded-full bg-accent-500/10 text-accent-600 text-[9px] font-extrabold uppercase tracking-wide">
                                          Ogni anno
                                        </span>{" "}
                                      </p>{" "}
                                      <p className="text-[11px] text-slate-500 font-semibold">
                                        â‚¬ {rule.prezzoNotte.toFixed(2)}/notte
                                      </p>{" "}
                                    </div>{" "}
                                    <button
                                      type="button"
                                      onClick={() => startAddException(rule)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-500/10 transition-all cursor-pointer flex-shrink-0"
                                      title="Aggiungi eccezione per un anno"
                                    >
                                      {" "}
                                      <CalendarPlus className="w-3.5 h-3.5" />{" "}
                                    </button>{" "}
                                    <button
                                      type="button"
                                      onClick={() => startEditRate(rule)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-accent-500 hover:bg-accent-500/10 transition-all cursor-pointer flex-shrink-0"
                                      title="Modifica"
                                    >
                                      {" "}
                                      <Pencil className="w-3.5 h-3.5" />{" "}
                                    </button>{" "}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteRate(
                                          rule.id,
                                          exceptions.length > 0
                                            ? exceptions.length === 1
                                              ? ` VerrÃ  eliminata anche l'eccezione collegata.`
                                              : ` Verranno eliminate anche le ${exceptions.length} eccezioni collegate.`
                                            : undefined,
                                        )
                                      }
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer flex-shrink-0"
                                      title="Elimina"
                                    >
                                      {" "}
                                      <Trash2 className="w-3.5 h-3.5" />{" "}
                                    </button>{" "}
                                  </div>{" "}
                                  {exceptions.map((exc) => (
                                    <div
                                      key={exc.id}
                                      className={`ml-6 flex items-center gap-3 px-3 py-2 rounded-xl border transition-all ${editingRateId === exc.id ? "bg-accent-500/5 border-accent-400 ring-1 ring-accent-400/40" : "bg-amber-50/60 border-amber-200/60"}`}
                                    >
                                      {" "}
                                      <div className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-700 flex items-center justify-center flex-shrink-0">
                                        {" "}
                                        <CalendarRange className="w-3.5 h-3.5" />{" "}
                                      </div>{" "}
                                      <div className="flex-1 min-w-0">
                                        {" "}
                                        <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 flex-wrap">
                                          {" "}
                                          {formatRateRange(
                                            exc.dataInizio,
                                            exc.dataFine,
                                          )}{" "}
                                          <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-700 text-[9px] font-extrabold uppercase tracking-wide">
                                            Eccezione
                                          </span>{" "}
                                          {isConcluded(exc) && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500 text-[9px] font-extrabold uppercase tracking-wide">
                                              Concluso
                                            </span>
                                          )}{" "}
                                        </p>{" "}
                                        <p className="text-[10px] text-slate-500 font-semibold">
                                          â‚¬ {exc.prezzoNotte.toFixed(2)}/notte
                                        </p>{" "}
                                      </div>{" "}
                                      <button
                                        type="button"
                                        onClick={() => startEditRate(exc)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-accent-500 hover:bg-accent-500/10 transition-all cursor-pointer flex-shrink-0"
                                        title="Modifica"
                                      >
                                        {" "}
                                        <Pencil className="w-3 h-3" />{" "}
                                      </button>{" "}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteRate(exc.id)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer flex-shrink-0"
                                        title="Elimina"
                                      >
                                        {" "}
                                        <Trash2 className="w-3 h-3" />{" "}
                                      </button>{" "}
                                    </div>
                                  ))}{" "}
                                </div>
                              ))}{" "}
                            </div>{" "}
                          </div>
                        )}{" "}
                        {visibleOneOffs.length > 0 && (
                          <div>
                            {" "}
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                              Periodi singoli
                            </p>{" "}
                            <div className="space-y-2">
                              {" "}
                              {visibleOneOffs.map((rate) => (
                                <div
                                  key={rate.id}
                                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${editingRateId === rate.id ? "bg-accent-500/5 border-accent-400 ring-1 ring-accent-400/40" : "bg-slate-50/80 border-slate-200/60"}`}
                                >
                                  {" "}
                                  <div className="w-8 h-8 rounded-full bg-accent-500/10 text-accent-500 flex items-center justify-center flex-shrink-0">
                                    {" "}
                                    <CalendarRange className="w-4 h-4" />{" "}
                                  </div>{" "}
                                  <div className="flex-1 min-w-0">
                                    {" "}
                                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                      {" "}
                                      {formatRateRange(
                                        rate.dataInizio,
                                        rate.dataFine,
                                      )}{" "}
                                      {isConcluded(rate) && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500 text-[9px] font-extrabold uppercase tracking-wide">
                                          Concluso
                                        </span>
                                      )}{" "}
                                    </p>{" "}
                                    <p className="text-[11px] text-slate-500 font-semibold">
                                      â‚¬ {rate.prezzoNotte.toFixed(2)}/notte
                                    </p>{" "}
                                  </div>{" "}
                                  <button
                                    type="button"
                                    onClick={() => startEditRate(rate)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-accent-500 hover:bg-accent-500/10 transition-all cursor-pointer flex-shrink-0"
                                    title="Modifica"
                                  >
                                    {" "}
                                    <Pencil className="w-3.5 h-3.5" />{" "}
                                  </button>{" "}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRate(rate.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer flex-shrink-0"
                                    title="Elimina"
                                  >
                                    {" "}
                                    <Trash2 className="w-3.5 h-3.5" />{" "}
                                  </button>{" "}
                                </div>
                              ))}{" "}
                            </div>{" "}
                          </div>
                        )}{" "}
                        {pastItems.length > 0 && (
                          <div>
                            {" "}
                            <button
                              type="button"
                              onClick={() => setShowPastPeriods((s) => !s)}
                              className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider mb-2 cursor-pointer transition-colors"
                            >
                              {" "}
                              {showPastPeriods ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}{" "}
                              Periodi passati ({pastItems.length}){" "}
                            </button>{" "}
                            {showPastPeriods && (
                              <div className="space-y-2">
                                {" "}
                                {pastItems.map(({ rate, parentLabel }) => (
                                  <div
                                    key={rate.id}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${editingRateId === rate.id ? "bg-accent-500/5 border-accent-400 ring-1 ring-accent-400/40" : "bg-slate-50/50 border-slate-200/60 opacity-70"}`}
                                  >
                                    {" "}
                                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center flex-shrink-0">
                                      {" "}
                                      <CalendarRange className="w-4 h-4" />{" "}
                                    </div>{" "}
                                    <div className="flex-1 min-w-0">
                                      {" "}
                                      <p className="text-xs font-bold text-slate-600">
                                        {formatRateRange(
                                          rate.dataInizio,
                                          rate.dataFine,
                                        )}
                                      </p>{" "}
                                      <p className="text-[11px] text-slate-400 font-semibold">
                                        {" "}
                                        â‚¬ {rate.prezzoNotte.toFixed(2)}/notte
                                        {parentLabel && (
                                          <> Â· Eccezione di {parentLabel}</>
                                        )}{" "}
                                      </p>{" "}
                                    </div>{" "}
                                    <button
                                      type="button"
                                      onClick={() => startEditRate(rate)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-accent-500 hover:bg-accent-500/10 transition-all cursor-pointer flex-shrink-0"
                                      title="Modifica"
                                    >
                                      {" "}
                                      <Pencil className="w-3.5 h-3.5" />{" "}
                                    </button>{" "}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRate(rate.id)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer flex-shrink-0"
                                      title="Elimina"
                                    >
                                      {" "}
                                      <Trash2 className="w-3.5 h-3.5" />{" "}
                                    </button>{" "}
                                  </div>
                                ))}{" "}
                              </div>
                            )}{" "}
                          </div>
                        )}{" "}
                      </>
                    )}{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </div>
          );
        })()}{" "}
      {/* Modal 2: Create or EDIT Reservation (Double functionality!) */}{" "}
      {showReservationModal &&
        (() => {
          const isExternalIcal =
            selectedReservationForEdit?.source === "EXTERNAL_ICAL";
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
              {" "}
              <div className="gradient-border-wrapper w-full max-w-2xl max-h-[92vh] flex flex-col">
                {" "}
                <form
                  onSubmit={handleSaveReservation}
                  className="glass-panel relative flex flex-col max-h-[92vh] overflow-hidden p-0 bg-white/95 flex-grow"
                >
                  {" "}
                  {/* Fixed Header */}{" "}
                  <div className="p-6 pb-4 border-b border-slate-200/50 shrink-0">
                    {" "}
                    <div className="flex justify-between items-center">
                      {" "}
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        {" "}
                        <CalendarRange className="w-5 h-5 text-accent-500" />{" "}
                        {selectedReservationForEdit
                          ? "Modifica Prenotazione"
                          : "Nuova Prenotazione"}{" "}
                      </h3>{" "}
                      <button
                        type="button"
                        onClick={closeReservationModal}
                        className="text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        {" "}
                        <X className="w-5 h-5" />{" "}
                      </button>{" "}
                    </div>{" "}
                    {/* Status bar â€” solo in modifica */}{" "}
                    {selectedReservationForEdit &&
                      (() => {
                        const statuses = [
                          {
                            key: "CONFIRMED",
                            label: "Confermata",
                            color:
                              "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
                          },
                          {
                            key: "READY_FOR_CHECKIN",
                            label: "Pronta Check-in",
                            color:
                              "bg-blue-500/10 text-blue-700 border-blue-500/30",
                          },
                          {
                            key: "CHECKED_IN",
                            label: "Ospite in struttura",
                            color:
                              "bg-primary-500/10 text-primary-600 border-primary-500/30",
                          },
                          {
                            key: "CHECKED_OUT",
                            label: "Check-out",
                            color:
                              "bg-slate-100 text-slate-600 border-slate-300",
                          },
                          {
                            key: "NO_SHOW",
                            label: "No Show",
                            color:
                              "bg-orange-500/10 text-orange-700 border-orange-500/30",
                          },
                          {
                            key: "CANCELLED",
                            label: "Cancellata",
                            color:
                              "bg-red-500/10 text-red-600 border-red-500/30",
                          },
                        ];
                        const current = selectedReservationForEdit.status;
                        return (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {" "}
                            {statuses.map((s) => (
                              <button
                                key={s.key}
                                type="button"
                                onClick={async () => {
                                  if (s.key === current) return;
                                  if (s.key === "CHECKED_OUT") {
                                    const taxText = touristTaxResult
                                      ? `Tassa di soggiorno da riscuotere: <b>â‚¬ ${touristTaxResult.totale.toFixed(2)}</b>`
                                      : touristTaxError
                                        ? `Tassa di soggiorno: ${touristTaxError}`
                                        : "Importo tassa di soggiorno non disponibile.";
                                    const confirmed = await Swal.fire({
                                      icon: "question",
                                      title: "Confermi il Check-out?",
                                      html: taxText,
                                      showCancelButton: true,
                                      confirmButtonText: "Conferma Check-out",
                                      cancelButtonText: "Annulla",
                                      customClass: {
                                        confirmButton:
                                          "btn-glow-primary px-4 py-2 rounded-xl text-white text-xs font-bold mx-1",
                                        cancelButton:
                                          "px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold mx-1",
                                      },
                                      buttonsStyling: false,
                                      background: "rgba(255,255,255,0.95)",
                                    });
                                    if (!confirmed.isConfirmed) return;
                                  }
                                  try {
                                    const res = await apiFetch(
                                      `/api/reservations/${selectedReservationForEdit.id}/status`,
                                      {
                                        method: "PUT",
                                        body: JSON.stringify({ status: s.key }),
                                      },
                                    );
                                    if (res.ok) {
                                      setSelectedReservationForEdit({
                                        ...selectedReservationForEdit,
                                        status: s.key,
                                      });
                                      fetchData();
                                    }
                                  } catch (_) {}
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${s.key === current ? s.color + " scale-105 shadow-sm" : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"}`}
                              >
                                {" "}
                                {s.label}{" "}
                              </button>
                            ))}{" "}
                          </div>
                        );
                      })()}{" "}
                  </div>{" "}
                  {/* Tab Navigation */}{" "}
                  <div className="flex gap-1 px-6 pt-2 border-b border-slate-200/60 shrink-0 overflow-x-auto scrollbar-thin">
                    {" "}
                    {[
                      {
                        id: "soggiorno" as const,
                        label: "Soggiorno",
                        icon: CalendarRange,
                      },
                      { id: "cliente" as const, label: "Cliente", icon: User },
                      {
                        id: "accompagnatori" as const,
                        label: "Accompagnatori",
                        icon: Users,
                      },
                      {
                        id: "tassa" as const,
                        label: "Tassa & Extra",
                        icon: Coins,
                      },
                      ...(selectedReservationForEdit
                        ? [
                            {
                              id: "ricevuta" as const,
                              label: "Ricevuta",
                              icon: Download,
                            },
                          ]
                        : []),
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeResTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveResTab(tab.id)}
                          className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all cursor-pointer ${isActive ? "border-accent-500 text-accent-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                        >
                          {" "}
                          <Icon className="w-3.5 h-3.5" /> {tab.label}{" "}
                        </button>
                      );
                    })}{" "}
                  </div>{" "}
                  {/* Scrollable Body */}{" "}
                  <div className="flex-grow overflow-y-auto p-6 scrollbar-thin">
                    {" "}
                    {isExternalIcal && activeResTab === "soggiorno" && (
                      <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-medium flex items-start gap-2.5 leading-relaxed">
                        {" "}
                        <Globe className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />{" "}
                        <div>
                          {" "}
                          <span className="font-bold block text-amber-800 mb-0.5">
                            Sincronizzazione Automatica
                          </span>{" "}
                          Date e camera sono importate via iCal e gestite dal
                          canale OTA: non modificabili qui. Collega perÃ²
                          l'anagrafica ospite qui sotto â€” Ã¨ necessaria per la
                          comunicazione Alloggiati Web e il calcolo della tassa
                          di soggiorno, che altrimenti non vengono effettuati
                          per questa prenotazione.{" "}
                        </div>{" "}
                      </div>
                    )}{" "}
                    <div className="space-y-4">
                      {" "}
                      {activeResTab === "soggiorno" && (
                        <div className="bg-slate-50 rounded-2xl border border-slate-200/50 transition-all duration-300">
                          {" "}
                          <div className="flex items-center p-4 select-none rounded-t-2xl">
                            {" "}
                            <span className="text-[10px] font-bold text-accent-600 uppercase tracking-widest flex items-center gap-1.5">
                              {" "}
                              <CalendarRange className="w-3.5 h-3.5 text-accent-500" />{" "}
                              Dettagli Soggiorno{" "}
                            </span>{" "}
                          </div>{" "}
                          {true && (
                            <div className="p-4 pt-0 space-y-4 border-t border-slate-200/20">
                              {" "}
                              <div className="pt-3">
                                {" "}
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                  Seleziona Camera
                                </label>{" "}
                                <select
                                  required
                                  disabled={isExternalIcal}
                                  value={newResRoomId}
                                  onChange={(e) =>
                                    setNewResRoomId(e.target.value)
                                  }
                                  className="glass-input block w-full px-3 py-3 rounded-xl text-slate-900 text-sm focus:outline-none bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {" "}
                                  <option value="">Seleziona...</option>{" "}
                                  {rooms.map((room) => (
                                    <option key={room.id} value={room.id}>
                                      {room.name} ({room.type})
                                    </option>
                                  ))}{" "}
                                </select>{" "}
                              </div>{" "}
                              <div className="grid grid-cols-2 gap-4">
                                {" "}
                                <div>
                                  {" "}
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                    Check-In
                                  </label>{" "}
                                  <input
                                    type="date"
                                    required
                                    lang="it"
                                    disabled={isExternalIcal}
                                    value={newResCheckIn}
                                    onChange={(e) =>
                                      setNewResCheckIn(e.target.value)
                                    }
                                    className="glass-input block w-full px-3 py-3 rounded-xl text-slate-900 text-sm focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                                  />{" "}
                                </div>{" "}
                                <div>
                                  {" "}
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                    Check-Out
                                  </label>{" "}
                                  <input
                                    type="date"
                                    required
                                    lang="it"
                                    disabled={isExternalIcal}
                                    value={newResCheckOut}
                                    onChange={(e) =>
                                      setNewResCheckOut(e.target.value)
                                    }
                                    className="glass-input block w-full px-3 py-3 rounded-xl text-slate-900 text-sm focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                                  />{" "}
                                </div>{" "}
                              </div>{" "}
                              <div>
                                {" "}
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                  Canale / Sorgente
                                </label>{" "}
                                <select
                                  disabled={isExternalIcal}
                                  value={newResSource}
                                  onChange={(e) =>
                                    setNewResSource(e.target.value)
                                  }
                                  className="glass-input block w-full px-3 py-3 rounded-xl text-slate-900 text-sm focus:outline-none bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {" "}
                                  <option value="DIRECT">
                                    Diretto (Telefono/Email)
                                  </option>{" "}
                                  <option value="AIRBNB">Airbnb</option>{" "}
                                  <option value="BOOKING_COM">
                                    Booking.com
                                  </option>{" "}
                                  <option value="EXTERNAL_ICAL">
                                    Sincronizzazione iCal
                                  </option>{" "}
                                </select>{" "}
                              </div>{" "}
                              {!isExternalIcal && (
                                <div>
                                  {" "}
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                    Prezzo per Notte (â‚¬)
                                  </label>{" "}
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={newResPrice}
                                    onChange={(e) =>
                                      setNewResPrice(e.target.value)
                                    }
                                    placeholder="Non impostato"
                                    className="glass-input block w-full px-3 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                                  />{" "}
                                  {newResPrice &&
                                    newResCheckIn &&
                                    newResCheckOut &&
                                    (() => {
                                      const nights = Math.round(
                                        (new Date(newResCheckOut).getTime() -
                                          new Date(newResCheckIn).getTime()) /
                                          (1000 * 60 * 60 * 24),
                                      );
                                      const soggiorno =
                                        nights > 0
                                          ? nights * parseFloat(newResPrice)
                                          : null;
                                      const extra = charges.reduce(
                                        (s, c) => s + c.importo,
                                        0,
                                      );
                                      if (soggiorno === null) return null;
                                      return (
                                        <p className="text-[10px] text-slate-500 font-semibold mt-1.5 ml-1">
                                          {" "}
                                          {extra > 0 ? (
                                            <>
                                              {" "}
                                              Soggiorno:{" "}
                                              <span className="font-bold">
                                                â‚¬ {soggiorno.toFixed(2)}
                                              </span>{" "}
                                              ({nights}{" "}
                                              {nights === 1 ? "notte" : "notti"}
                                              ) {" + "}extra:{" "}
                                              <span className="font-bold">
                                                â‚¬ {extra.toFixed(2)}
                                              </span>{" "}
                                              {" = "}Totale:{" "}
                                              <span className="text-accent-600 font-bold">
                                                â‚¬{" "}
                                                {(soggiorno + extra).toFixed(2)}
                                              </span>{" "}
                                            </>
                                          ) : (
                                            <>
                                              Totale soggiorno:{" "}
                                              <span className="text-accent-600 font-bold">
                                                â‚¬ {soggiorno.toFixed(2)}
                                              </span>{" "}
                                              ({nights}{" "}
                                              {nights === 1 ? "notte" : "notti"}
                                              )
                                            </>
                                          )}{" "}
                                        </p>
                                      );
                                    })()}{" "}
                                </div>
                              )}{" "}
                            </div>
                          )}{" "}
                        </div>
                      )}{" "}
                      {/* Addebiti Extra â€” tassa tab, edit mode only */}{" "}
                      {selectedReservationForEdit &&
                        activeResTab === "tassa" && (
                          <div className="bg-slate-50 rounded-2xl border border-slate-200/50 transition-all duration-300">
                            {" "}
                            <div className="flex justify-between items-center p-4 select-none rounded-t-2xl">
                              {" "}
                              <span className="text-[10px] font-bold text-accent-600 uppercase tracking-widest flex items-center gap-1.5">
                                {" "}
                                <Receipt className="w-3.5 h-3.5 text-accent-500" />{" "}
                                Addebiti Extra{" "}
                              </span>{" "}
                              <div className="flex items-center gap-2">
                                {" "}
                                {charges.length > 0 && (
                                  <span className="text-xs font-extrabold text-accent-600">
                                    â‚¬{" "}
                                    {charges
                                      .reduce((s, c) => s + c.importo, 0)
                                      .toFixed(2)}
                                  </span>
                                )}{" "}
                              </div>{" "}
                            </div>{" "}
                            {true && (
                              <div className="p-4 pt-0 space-y-3 border-t border-slate-200/20">
                                {" "}
                                <div className="flex gap-2 pt-3">
                                  {" "}
                                  <input
                                    type="text"
                                    value={newChargeDesc}
                                    onChange={(e) =>
                                      setNewChargeDesc(e.target.value)
                                    }
                                    placeholder="Es. Cambio biancheria, minibar..."
                                    className="glass-input flex-1 px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                                  />{" "}
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={newChargeAmount}
                                    onChange={(e) =>
                                      setNewChargeAmount(e.target.value)
                                    }
                                    placeholder="â‚¬"
                                    className="glass-input w-20 px-2.5 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                                  />{" "}
                                  <button
                                    type="button"
                                    onClick={handleAddCharge}
                                    className="px-3 py-2 rounded-xl text-white font-bold bg-accent-500 hover:bg-accent-600 transition-all flex items-center justify-center cursor-pointer shadow-md flex-shrink-0"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>{" "}
                                </div>{" "}
                                {charges.length === 0 ? (
                                  <p className="text-xs text-slate-400 text-center py-2">
                                    Nessuna voce extra aggiunta.
                                  </p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {" "}
                                    {charges.map((c) => (
                                      <div
                                        key={c.id}
                                        className="flex justify-between items-center p-2 px-3 rounded-xl bg-white border border-slate-200/60 text-xs"
                                      >
                                        {" "}
                                        <span className="font-semibold text-slate-700 truncate pr-2">
                                          {c.descrizione}
                                        </span>{" "}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          {" "}
                                          <span className="font-bold text-slate-800">
                                            â‚¬ {c.importo.toFixed(2)}
                                          </span>{" "}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteCharge(c.id)
                                            }
                                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>{" "}
                                        </div>{" "}
                                      </div>
                                    ))}{" "}
                                    <div className="flex justify-between items-center pt-2 px-1">
                                      {" "}
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        {charges.length}{" "}
                                        {charges.length === 1 ? "voce" : "voci"}
                                      </span>{" "}
                                      <span className="text-sm font-extrabold text-accent-600">
                                        Totale extra: â‚¬{" "}
                                        {charges
                                          .reduce((s, c) => s + c.importo, 0)
                                          .toFixed(2)}
                                      </span>{" "}
                                    </div>{" "}
                                  </div>
                                )}{" "}
                              </div>
                            )}{" "}
                          </div>
                        )}{" "}
                      {/* Ricevuta â€” ricevuta tab, edit mode only */}{" "}
                      {selectedReservationForEdit &&
                        activeResTab === "ricevuta" && (
                          <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between gap-3 select-none flex-wrap">
                            {" "}
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                              {" "}
                              <Download className="w-3.5 h-3.5 text-accent-500" />{" "}
                              Ricevuta di Soggiorno (PDF){" "}
                            </span>{" "}
                            <div className="flex rounded-xl border border-accent-500/20 overflow-hidden flex-shrink-0">
                              {" "}
                              <select
                                value={receiptLang}
                                onChange={(e) =>
                                  setReceiptLang(
                                    e.target.value as typeof receiptLang,
                                  )
                                }
                                title="Lingua della ricevuta"
                                className="text-accent-600 bg-white font-bold text-[10px] uppercase tracking-widest pl-3 pr-1 border-r border-accent-500/20 focus:outline-none cursor-pointer"
                              >
                                {" "}
                                <option value="it">IT</option>
                                <option value="en">EN</option>
                                <option value="es">ES</option>
                                <option value="de">DE</option>
                                <option value="fr">FR</option>{" "}
                              </select>{" "}
                              <button
                                type="button"
                                onClick={handleDownloadReceipt}
                                className="px-4 py-2 text-white bg-accent-500 hover:bg-accent-600 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                              >
                                {" "}
                                <Download className="w-3.5 h-3.5" />{" "}
                                Scarica{" "}
                              </button>{" "}
                            </div>{" "}
                          </div>
                        )}{" "}
                      {activeResTab === "cliente" && (
                        <div className="bg-slate-50 rounded-2xl border border-slate-200/50 transition-all duration-300">
                          {" "}
                          <div className="flex justify-between items-center p-4 select-none rounded-t-2xl">
                            {" "}
                            <span className="text-[10px] font-bold text-accent-600 uppercase tracking-widest flex items-center gap-1.5">
                              {" "}
                              <User className="w-3.5 h-3.5 text-accent-500" />{" "}
                              Registro Clienti (CRM){" "}
                            </span>{" "}
                          </div>{" "}
                          {true && (
                            <div className="p-4 pt-0 space-y-4 border-t border-slate-200/20">
                              {" "}
                              <div className="flex justify-between items-center select-none pt-3">
                                {" "}
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                  Gestione Anagrafica
                                </span>{" "}
                                <div className="flex gap-1.5">
                                  {" "}
                                  {selectedCustomer && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewCustomerNome(
                                          selectedCustomer.nome,
                                        );
                                        setNewCustomerCognome(
                                          selectedCustomer.cognome,
                                        );
                                        setNewCustomerSesso(
                                          selectedCustomer.sesso || "M",
                                        );
                                        setNewCustomerBirth(
                                          selectedCustomer.dataNascita,
                                        );
                                        setNewCustomerBirthPlace(
                                          selectedCustomer.luogoNascita || "",
                                        );
                                        setNewCustomerCitizen(
                                          selectedCustomer.cittadinanza ||
                                            "100000100",
                                        );
                                        setNewCustomerDocType(
                                          selectedCustomer.tipoDocumento ||
                                            "CARTA_IDENTITA",
                                        );
                                        setNewCustomerDocNum(
                                          selectedCustomer.numeroDocumento ||
                                            "",
                                        );
                                        setNewCustomerDocPlace(
                                          selectedCustomer.luogoRilascio || "",
                                        );
                                        setShowCreateCustomer(true);
                                      }}
                                      className="text-[9px] font-bold text-amber-600 hover:text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-lg transition-all"
                                    >
                                      {" "}
                                      Modifica Anagrafica{" "}
                                    </button>
                                  )}{" "}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (showCreateCustomer) {
                                        setShowCreateCustomer(false);
                                      } else {
                                        setNewCustomerNome("");
                                        setNewCustomerCognome("");
                                        setNewCustomerSesso("M");
                                        setNewCustomerBirth("");
                                        setNewCustomerBirthPlace("");
                                        setNewCustomerCitizen("100000100");
                                        setNewCustomerDocType("CARTA_IDENTITA");
                                        setNewCustomerDocNum("");
                                        setNewCustomerDocPlace("");
                                        setSelectedCustomer(null);
                                        setShowCreateCustomer(true);
                                      }
                                    }}
                                    className="text-[9px] font-bold text-accent-600 hover:text-accent-700 bg-accent-500/10 hover:bg-accent-500/20 px-2 py-1 rounded-lg transition-all"
                                  >
                                    {" "}
                                    {showCreateCustomer
                                      ? "Cerca Anagrafica"
                                      : "+ Crea Nuovo"}{" "}
                                  </button>{" "}
                                </div>{" "}
                              </div>{" "}
                              {isExternalIcal && newResGuest && (
                                <div>
                                  {" "}
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">
                                    Nome Ospite (da iCal, come riferimento)
                                  </label>{" "}
                                  <input
                                    type="text"
                                    disabled
                                    value={newResGuest}
                                    className="glass-input block w-full px-3.5 py-2.5 rounded-xl text-slate-700 text-xs focus:outline-none bg-slate-100"
                                  />{" "}
                                </div>
                              )}{" "}
                              {!showCreateCustomer && (
                                <div className="relative">
                                  {" "}
                                  <input
                                    type="text"
                                    value={
                                      selectedCustomer
                                        ? `${selectedCustomer.cognome} ${selectedCustomer.nome}`
                                        : customerSearch
                                    }
                                    onChange={(e) => {
                                      setCustomerSearch(e.target.value);
                                      setSelectedCustomer(null);
                                    }}
                                    className="glass-input block w-full px-3.5 py-2.5 rounded-xl text-slate-900 text-xs focus:outline-none"
                                    placeholder="Cerca cliente per Cognome o Nome..."
                                  />{" "}
                                  {selectedCustomer && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedCustomer(null);
                                        setCustomerSearch("");
                                      }}
                                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-900"
                                    >
                                      {" "}
                                      <X className="w-3.5 h-3.5" />{" "}
                                    </button>
                                  )}{" "}
                                  {customerResults.length > 0 && (
                                    <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50">
                                      {" "}
                                      {customerResults.map((cust) => (
                                        <button
                                          key={cust.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedCustomer(cust);
                                            setCustomerSearch(
                                              `${cust.cognome} ${cust.nome}`,
                                            );
                                            setCustomerResults([]);
                                          }}
                                          className="w-full text-left px-3 py-2 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors"
                                        >
                                          {" "}
                                          {cust.cognome} {cust.nome} (
                                          {cust.dataNascita}){" "}
                                        </button>
                                      ))}{" "}
                                    </div>
                                  )}{" "}
                                </div>
                              )}{" "}
                              {showCreateCustomer && (
                                <div className="space-y-3">
                                  {" "}
                                  <div className="flex justify-between items-center">
                                    {" "}
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                      Nuovo Profilo Cliente
                                    </span>{" "}
                                    <button
                                      type="button"
                                      onClick={() => setShowResScanner(true)}
                                      className="px-2 py-1 bg-accent-500/10 hover:bg-accent-500 hover:text-white text-accent-600 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      {" "}
                                      <Sparkles className="w-3 h-3" /> Scansiona
                                      ID{" "}
                                    </button>{" "}
                                  </div>{" "}
                                  <div className="grid grid-cols-2 gap-2">
                                    {" "}
                                    <input
                                      type="text"
                                      required
                                      placeholder="Nome *"
                                      value={newCustomerNome}
                                      onChange={(e) =>
                                        setNewCustomerNome(e.target.value)
                                      }
                                      className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                                    />{" "}
                                    <input
                                      type="text"
                                      required
                                      placeholder="Cognome *"
                                      value={newCustomerCognome}
                                      onChange={(e) =>
                                        setNewCustomerCognome(e.target.value)
                                      }
                                      className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                                    />{" "}
                                  </div>{" "}
                                  <div className="grid grid-cols-3 gap-2">
                                    {" "}
                                    <select
                                      value={newCustomerSesso}
                                      onChange={(e) =>
                                        setNewCustomerSesso(e.target.value)
                                      }
                                      className="glass-input block w-full px-2 py-2 rounded-xl text-slate-900 text-xs focus:outline-none bg-white"
                                    >
                                      {" "}
                                      <option value="M">M</option>{" "}
                                      <option value="F">F</option>{" "}
                                    </select>{" "}
                                    <input
                                      type="date"
                                      required
                                      placeholder="Nascita *"
                                      value={newCustomerBirth}
                                      onChange={(e) =>
                                        setNewCustomerBirth(e.target.value)
                                      }
                                      className="glass-input col-span-2 block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                                    />{" "}
                                  </div>{" "}
                                  <div className="grid grid-cols-2 gap-2">
                                    {" "}
                                    <input
                                      type="text"
                                      placeholder="Luogo Nascita"
                                      value={newCustomerBirthPlace}
                                      onChange={(e) =>
                                        setNewCustomerBirthPlace(e.target.value)
                                      }
                                      className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                                    />{" "}
                                    <select
                                      value={newCustomerCitizen}
                                      onChange={(e) =>
                                        setNewCustomerCitizen(e.target.value)
                                      }
                                      className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none bg-white"
                                    >
                                      {" "}
                                      {CITIZENSHIP_OPTIONS.map((c) => (
                                        <option key={c.code} value={c.code}>
                                          {c.name}
                                        </option>
                                      ))}{" "}
                                    </select>{" "}
                                  </div>{" "}
                                  <div className="grid grid-cols-3 gap-2">
                                    {" "}
                                    <select
                                      value={newCustomerDocType}
                                      onChange={(e) =>
                                        setNewCustomerDocType(e.target.value)
                                      }
                                      className="glass-input block w-full px-1 py-2 rounded-xl text-slate-900 text-[10px] focus:outline-none bg-white"
                                    >
                                      {" "}
                                      <option value="CARTA_IDENTITA">
                                        Carta ID
                                      </option>{" "}
                                      <option value="PASSAPORTO">
                                        Passaporto
                                      </option>{" "}
                                      <option value="PATENTE">
                                        Patente
                                      </option>{" "}
                                    </select>{" "}
                                    <input
                                      type="text"
                                      placeholder="Numero Doc"
                                      value={newCustomerDocNum}
                                      onChange={(e) =>
                                        setNewCustomerDocNum(e.target.value)
                                      }
                                      className="glass-input col-span-2 block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                                    />{" "}
                                  </div>{" "}
                                  <input
                                    type="text"
                                    placeholder="Luogo Rilascio"
                                    value={newCustomerDocPlace}
                                    onChange={(e) =>
                                      setNewCustomerDocPlace(e.target.value)
                                    }
                                    className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                                  />{" "}
                                  <button
                                    type="button"
                                    onClick={handleSavePrimaryCustomer}
                                    className="w-full py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                                  >
                                    {" "}
                                    {selectedCustomer
                                      ? "Salva Modifiche Anagrafica"
                                      : "Salva e Collega Anagrafica"}{" "}
                                  </button>{" "}
                                </div>
                              )}{" "}
                            </div>
                          )}{" "}
                        </div>
                      )}{" "}
                      {activeResTab === "accompagnatori" && (
                        <div className="bg-slate-50 rounded-2xl border border-slate-200/50 transition-all duration-300">
                          {" "}
                          <div className="flex justify-between items-center p-4 select-none rounded-t-2xl">
                            {" "}
                            <span className="text-[10px] font-bold text-accent-600 uppercase tracking-widest flex items-center gap-1.5">
                              {" "}
                              <Users className="w-3.5 h-3.5 text-accent-500" />{" "}
                              Accompagnatori in Stanza{" "}
                            </span>{" "}
                          </div>{" "}
                          {true && (
                            <div className="p-4 pt-0 space-y-3 border-t border-slate-200/20">
                              {" "}
                              <div className="flex justify-between items-center select-none pt-3">
                                {" "}
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                  Gestione Accompagnatori
                                </span>{" "}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (showCreateAccompanying) {
                                      setShowCreateAccompanying(false);
                                    } else {
                                      setNewAccNome("");
                                      setNewAccCognome("");
                                      setNewAccSesso("M");
                                      setNewAccBirth("");
                                      setNewAccBirthPlace("");
                                      setNewAccCitizen("100000100");
                                      setShowCreateAccompanying(true);
                                    }
                                  }}
                                  className="text-[9px] font-bold text-accent-600 hover:text-accent-700 bg-accent-500/10 hover:bg-accent-500/20 px-2 py-1 rounded-lg transition-all"
                                >
                                  {" "}
                                  {showCreateAccompanying
                                    ? "Cerca Anagrafica"
                                    : "+ Crea Nuovo"}{" "}
                                </button>{" "}
                              </div>{" "}
                              {!showCreateAccompanying && (
                                <div className="relative">
                                  {" "}
                                  <input
                                    type="text"
                                    value={accSearch}
                                    onChange={(e) =>
                                      setAccSearch(e.target.value)
                                    }
                                    className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                                    placeholder="Cerca ed aggiungi accompagnatori..."
                                  />{" "}
                                  {accResults.length > 0 && (
                                    <div className="absolute left-0 right-0 mt-1 max-h-36 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50">
                                      {" "}
                                      {accResults.map((cust) => (
                                        <button
                                          key={cust.id}
                                          type="button"
                                          onClick={() => {
                                            if (
                                              !accompanyingGuests.some(
                                                (ag) => ag.id === cust.id,
                                              )
                                            ) {
                                              setAccompanyingGuests([
                                                ...accompanyingGuests,
                                                cust,
                                              ]);
                                            }
                                            setAccSearch("");
                                            setAccResults([]);
                                          }}
                                          className="w-full text-left px-3 py-1.5 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors"
                                        >
                                          {" "}
                                          {cust.cognome} {cust.nome} (
                                          {cust.dataNascita}){" "}
                                        </button>
                                      ))}{" "}
                                    </div>
                                  )}{" "}
                                </div>
                              )}{" "}
                              {showCreateAccompanying && (
                                <div className="space-y-3 pt-1">
                                  {" "}
                                  <div className="flex justify-between items-center">
                                    {" "}
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                      Nuovo Accompagnatore
                                    </span>{" "}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setScannerTargetType("accompanying");
                                        setShowResScanner(true);
                                      }}
                                      className="px-2 py-1 bg-accent-500/10 hover:bg-accent-500 hover:text-white text-accent-600 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      {" "}
                                      <Sparkles className="w-3 h-3" /> Scansiona
                                      ID{" "}
                                    </button>{" "}
                                  </div>{" "}
                                  <div className="grid grid-cols-2 gap-2">
                                    {" "}
                                    <input
                                      type="text"
                                      required
                                      placeholder="Nome *"
                                      value={newAccNome}
                                      onChange={(e) =>
                                        setNewAccNome(e.target.value)
                                      }
                                      className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                                    />{" "}
                                    <input
                                      type="text"
                                      required
                                      placeholder="Cognome *"
                                      value={newAccCognome}
                                      onChange={(e) =>
                                        setNewAccCognome(e.target.value)
                                      }
                                      className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                                    />{" "}
                                  </div>{" "}
                                  <div className="grid grid-cols-3 gap-2">
                                    {" "}
                                    <select
                                      value={newAccSesso}
                                      onChange={(e) =>
                                        setNewAccSesso(e.target.value)
                                      }
                                      className="glass-input block w-full px-2 py-2 rounded-xl text-slate-900 text-xs focus:outline-none bg-white"
                                    >
                                      {" "}
                                      <option value="M">M</option>{" "}
                                      <option value="F">F</option>{" "}
                                    </select>{" "}
                                    <input
                                      type="date"
                                      required
                                      placeholder="Nascita *"
                                      value={newAccBirth}
                                      onChange={(e) =>
                                        setNewAccBirth(e.target.value)
                                      }
                                      className="glass-input col-span-2 block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                                    />{" "}
                                  </div>{" "}
                                  <div className="grid grid-cols-2 gap-2">
                                    {" "}
                                    <input
                                      type="text"
                                      placeholder="Luogo Nascita"
                                      value={newAccBirthPlace}
                                      onChange={(e) =>
                                        setNewAccBirthPlace(e.target.value)
                                      }
                                      className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                                    />{" "}
                                    <select
                                      value={newAccCitizen}
                                      onChange={(e) =>
                                        setNewAccCitizen(e.target.value)
                                      }
                                      className="glass-input block w-full px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none bg-white"
                                    >
                                      {" "}
                                      {CITIZENSHIP_OPTIONS.map((c) => (
                                        <option key={c.code} value={c.code}>
                                          {c.name}
                                        </option>
                                      ))}{" "}
                                    </select>{" "}
                                  </div>{" "}
                                  <button
                                    type="button"
                                    onClick={handleSaveAccompanyingGuest}
                                    className="w-full py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                                  >
                                    {" "}
                                    Salva e Aggiungi{" "}
                                  </button>{" "}
                                </div>
                              )}{" "}
                              {accompanyingGuests.length > 0 && (
                                <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                                  {" "}
                                  {accompanyingGuests.map((ag) => (
                                    <div
                                      key={ag.id}
                                      className="flex justify-between items-center p-2 px-3 rounded-xl bg-white border border-slate-200/60 text-xs"
                                    >
                                      {" "}
                                      <span className="font-bold text-slate-800">
                                        {ag.cognome} {ag.nome}
                                      </span>{" "}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setAccompanyingGuests(
                                            accompanyingGuests.filter(
                                              (g) => g.id !== ag.id,
                                            ),
                                          )
                                        }
                                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                      >
                                        {" "}
                                        <Trash2 className="w-3.5 h-3.5" />{" "}
                                      </button>{" "}
                                    </div>
                                  ))}{" "}
                                </div>
                              )}{" "}
                            </div>
                          )}{" "}
                        </div>
                      )}{" "}
                      {/* Tassa di Soggiorno â€” tassa tab */}{" "}
                      {activeResTab === "tassa" &&
                        (selectedCustomer || accompanyingGuests.length > 0) &&
                        newResCheckIn &&
                        newResCheckOut && (
                          <div className="bg-slate-50 rounded-2xl border border-slate-200/50 transition-all duration-300">
                            {" "}
                            <div className="flex justify-between items-center p-4 select-none rounded-t-2xl">
                              {" "}
                              <span className="text-[10px] font-bold text-accent-600 uppercase tracking-widest flex items-center gap-1.5">
                                {" "}
                                <Coins className="w-3.5 h-3.5 text-accent-500" />{" "}
                                Tassa di Soggiorno{" "}
                              </span>{" "}
                              <div className="flex items-center gap-2">
                                {" "}
                                {touristTaxResult && (
                                  <span className="text-xs font-extrabold text-accent-600">
                                    â‚¬ {touristTaxResult.totale.toFixed(2)}
                                  </span>
                                )}{" "}
                              </div>{" "}
                            </div>{" "}
                            {true && (
                              <div className="p-4 pt-0 space-y-2 border-t border-slate-200/20">
                                {" "}
                                {touristTaxLoading && (
                                  <p className="text-xs text-slate-400 text-center py-3">
                                    Calcolo in corso...
                                  </p>
                                )}{" "}
                                {touristTaxError && !touristTaxLoading && (
                                  <p className="text-xs text-amber-600 font-semibold py-3">
                                    {touristTaxError}
                                  </p>
                                )}{" "}
                                {!touristTaxLoading &&
                                  !touristTaxError &&
                                  touristTaxResult && (
                                    <>
                                      {" "}
                                      <div className="space-y-1.5 pt-3">
                                        {" "}
                                        {touristTaxResult.ospiti.map(
                                          (guest) => {
                                            const currentCategory =
                                              exemptionCategories.find(
                                                (c) =>
                                                  c.nome ===
                                                  guest.motivoEsenzione,
                                              );
                                            return (
                                              <div
                                                key={guest.guestId}
                                                className="flex items-center justify-between gap-2 p-2.5 px-3 rounded-xl bg-white border border-slate-200/60 text-xs"
                                              >
                                                {" "}
                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                  {" "}
                                                  <span className="font-bold text-slate-800 truncate">
                                                    {guest.nome}
                                                  </span>{" "}
                                                  <span
                                                    className={`text-[9px] font-bold uppercase tracking-wider w-fit px-2 py-0.5 rounded-full ${guest.tassabile ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                                                  >
                                                    {" "}
                                                    {guest.tassabile
                                                      ? "Tassabile"
                                                      : `Esente${guest.motivoEsenzione ? ` (${guest.motivoEsenzione})` : ""}`}{" "}
                                                  </span>{" "}
                                                </div>{" "}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                  {" "}
                                                  <span className="font-bold text-slate-700">
                                                    â‚¬{" "}
                                                    {guest.importo.toFixed(2)}
                                                  </span>{" "}
                                                  {selectedReservationForEdit ? (
                                                    <select
                                                      value={
                                                        currentCategory?.id ??
                                                        ""
                                                      }
                                                      onChange={(e) => {
                                                        const val =
                                                          e.target.value;
                                                        if (!val)
                                                          removeGuestExemption(
                                                            guest.guestId,
                                                          );
                                                        else {
                                                          const cat =
                                                            exemptionCategories.find(
                                                              (c) =>
                                                                c.id ===
                                                                parseInt(
                                                                  val,
                                                                  10,
                                                                ),
                                                            );
                                                          if (cat)
                                                            assignGuestExemption(
                                                              guest.guestId,
                                                              cat.nome,
                                                              cat.id,
                                                            );
                                                        }
                                                      }}
                                                      className="glass-input px-2 py-1.5 rounded-lg text-slate-900 text-[10px] focus:outline-none bg-white max-w-[130px]"
                                                    >
                                                      {" "}
                                                      <option value="">
                                                        Nessuna
                                                      </option>{" "}
                                                      {exemptionCategories.map(
                                                        (cat) => (
                                                          <option
                                                            key={cat.id}
                                                            value={cat.id}
                                                          >
                                                            {cat.nome}
                                                          </option>
                                                        ),
                                                      )}{" "}
                                                    </select>
                                                  ) : (
                                                    <span className="text-[9px] text-slate-400 italic max-w-[110px] text-right">
                                                      Esenzioni dopo il
                                                      salvataggio
                                                    </span>
                                                  )}{" "}
                                                </div>{" "}
                                              </div>
                                            );
                                          },
                                        )}{" "}
                                      </div>{" "}
                                      <div className="flex justify-between items-center pt-3 px-1">
                                        {" "}
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                          {" "}
                                          {touristTaxResult.nottiTassabili}{" "}
                                          notti tassabili{" "}
                                        </span>{" "}
                                        <span className="text-sm font-extrabold text-accent-600">
                                          Totale: â‚¬{" "}
                                          {touristTaxResult.totale.toFixed(2)}
                                        </span>{" "}
                                      </div>{" "}
                                    </>
                                  )}{" "}
                              </div>
                            )}{" "}
                          </div>
                        )}{" "}
                      {/* Public Self Check-in Link Copy Block â€” ricevuta tab */}{" "}
                      {selectedReservationForEdit &&
                        activeResTab === "ricevuta" && (
                          <div className="p-4 bg-accent-500/5 border border-accent-500/15 rounded-2xl space-y-2 select-none">
                            {" "}
                            <span className="text-[10px] font-bold text-accent-600 uppercase tracking-widest flex items-center gap-1">
                              {" "}
                              <Globe className="w-3.5 h-3.5" /> Portale Check-In
                              per il Cliente{" "}
                            </span>{" "}
                            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                              {" "}
                              Invia questo link al cliente via WhatsApp o Email
                              per il self-check-in da casa:{" "}
                            </p>{" "}
                            <div className="flex gap-2">
                              {" "}
                              <input
                                type="text"
                                readOnly
                                value={`${window.location.origin}/public/checkin/${selectedReservationForEdit.checkinToken}`}
                                className="glass-input flex-grow px-3 py-2 rounded-xl text-slate-600 text-[10px] focus:outline-none"
                              />{" "}
                              <button
                                type="button"
                                onClick={() => {
                                  const link = `${window.location.origin}/public/checkin/${selectedReservationForEdit.checkinToken}`;
                                  navigator.clipboard.writeText(link);
                                  Swal.fire({
                                    toast: true,
                                    position: "top-end",
                                    icon: "success",
                                    title: "Link copiato negli appunti!",
                                    showConfirmButton: false,
                                    timer: 2000,
                                    background: "rgba(255, 255, 255, 0.95)",
                                  });
                                }}
                                className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-accent-500/15 active:scale-95 shrink-0"
                              >
                                {" "}
                                <Copy className="w-3.5 h-3.5" /> Copia{" "}
                              </button>{" "}
                            </div>{" "}
                          </div>
                        )}{" "}
                    </div>
                    {/* end soggiorno tabs wrapper */}{" "}
                  </div>{" "}
                  {/* Sticky Footer */}{" "}
                  <div className="p-6 pt-4 border-t border-slate-200/50 flex gap-3 shrink-0 bg-white/75 backdrop-blur-sm select-none">
                    {" "}
                    {selectedReservationForEdit && (
                      <button
                        type="button"
                        onClick={handleDeleteReservation}
                        disabled={isExternalIcal}
                        className="px-4 py-3 rounded-xl text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500 border border-red-500/20 font-bold text-xs uppercase tracking-widest transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-40 disabled:hover:bg-red-500/10 disabled:hover:text-red-500 disabled:cursor-not-allowed"
                      >
                        {" "}
                        Elimina{" "}
                      </button>
                    )}{" "}
                    <button
                      type="submit"
                      disabled={isExternalIcal}
                      className="btn-glow-primary flex-grow py-3.5 px-4 rounded-xl text-white font-bold uppercase tracking-widest text-xs shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {" "}
                      {selectedReservationForEdit
                        ? "Salva Modifiche"
                        : "Salva Prenotazione"}{" "}
                    </button>{" "}
                  </div>{" "}
                </form>{" "}
              </div>{" "}
            </div>
          );
        })()}{" "}
      {/* Modal 3: iCal Sync Channels */}{" "}
      {showIcalModal && selectedIcalRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          {" "}
          <div className="gradient-border-wrapper w-full max-w-lg">
            {" "}
            <div className="glass-panel p-6 relative">
              {" "}
              <button
                onClick={() => setShowIcalModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
              >
                {" "}
                <X className="w-5 h-5" />{" "}
              </button>{" "}
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                {" "}
                <Globe className="w-5 h-5 text-accent-500" /> Sincronizzazione
                iCal{" "}
              </h3>{" "}
              <p className="text-xs text-slate-500 font-semibold mb-6">
                {" "}
                Sincronizza le date in automatico con Booking.com e Airbnb.{" "}
              </p>{" "}
              {/* iCal Private Link */}{" "}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 mb-6">
                {" "}
                <h4 className="text-[10px] font-bold text-accent-600 uppercase tracking-widest mb-2">
                  {" "}
                  Link Esportazione per OTAs (Copia su Airbnb/Booking){" "}
                </h4>{" "}
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/api/v1/ical/export/${selectedIcalRoomId}?token=${rooms.find((r) => r.id === selectedIcalRoomId)?.icalToken}`}
                  className="glass-input block w-full px-3 py-2 rounded-lg text-slate-700 text-[11px] focus:outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />{" "}
              </div>{" "}
              {/* Existing external iCal import links */}{" "}
              <div className="mb-6">
                {" "}
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  {" "}
                  Calendari Importati (In ingresso){" "}
                </h4>{" "}
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {" "}
                  {icalSources.length === 0 ? (
                    <div className="text-center text-xs text-slate-500 p-4 bg-slate-50 rounded-xl">
                      {" "}
                      Nessun canale sincronizzato. Aggiungi il link iCal di
                      Airbnb o Booking qui sotto.{" "}
                    </div>
                  ) : (
                    icalSources.map((src) => (
                      <div
                        key={src.id}
                        className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200/60"
                      >
                        {" "}
                        <div className="overflow-hidden truncate pr-2">
                          {" "}
                          <span className="text-xs font-bold text-slate-900 uppercase">
                            {src.channelName}
                          </span>{" "}
                          <p className="text-[10px] text-slate-500 truncate">
                            {src.url}
                          </p>{" "}
                        </div>{" "}
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                          {" "}
                          Sync:{" "}
                          {src.lastSyncedAt
                            ? new Date(src.lastSyncedAt).toLocaleTimeString()
                            : "Mai"}{" "}
                        </span>{" "}
                      </div>
                    ))
                  )}{" "}
                </div>{" "}
              </div>{" "}
              {/* Add external iCal import form */}{" "}
              <form
                onSubmit={handleAddIcalSource}
                className="space-y-4 pt-4 border-t border-slate-200/60"
              >
                {" "}
                <h4 className="text-[10px] font-bold text-accent-600 uppercase tracking-widest">
                  Aggiungi Calendario Canale
                </h4>{" "}
                <div className="grid grid-cols-3 gap-4">
                  {" "}
                  <div className="col-span-1">
                    {" "}
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                      Canale
                    </label>{" "}
                    <select
                      value={newIcalChannel}
                      onChange={(e) => setNewIcalChannel(e.target.value)}
                      className="glass-input block w-full px-3 py-3 rounded-xl text-slate-900 text-sm focus:outline-none bg-white"
                    >
                      {" "}
                      <option value="AIRBNB">Airbnb</option>{" "}
                      <option value="BOOKING_COM">Booking.com</option>{" "}
                      <option value="OTHER">Altro (iCal)</option>{" "}
                    </select>{" "}
                  </div>{" "}
                  <div className="col-span-2">
                    {" "}
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                      Link iCal (URL)
                    </label>{" "}
                    <input
                      type="url"
                      required
                      value={newIcalUrl}
                      onChange={(e) => setNewIcalUrl(e.target.value)}
                      className="glass-input block w-full px-3 py-3 rounded-xl text-slate-900 text-sm focus:outline-none"
                      placeholder="https://www.airbnb.it/calendar/ical/..."
                    />{" "}
                  </div>{" "}
                </div>{" "}
                <button
                  type="submit"
                  className="btn-glow-primary w-full flex justify-center py-2.5 px-4 rounded-xl text-white font-bold uppercase tracking-widest text-xs cursor-pointer"
                >
                  {" "}
                  Collega Canale{" "}
                </button>{" "}
              </form>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Modal 4: Italian Compliance Reports */}{" "}
      {showComplianceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          {" "}
          <div className="gradient-border-wrapper w-full max-w-md">
            {" "}
            <div className="glass-panel p-6 relative">
              {" "}
              <button
                onClick={() => setShowComplianceModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
              >
                {" "}
                <X className="w-5 h-5" />{" "}
              </button>{" "}
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                {" "}
                <ShieldCheck className="w-5 h-5 text-accent-500" /> Compliance &
                ISTAT{" "}
              </h3>{" "}
              {/* Alloggiati Web */}{" "}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 mb-6 space-y-3">
                {" "}
                <h4 className="text-[10px] font-bold text-accent-600 uppercase tracking-widest flex items-center gap-1.5">
                  {" "}
                  <MapPin className="w-4 h-4" /> Alloggiati Web (Polizia di
                  Stato){" "}
                </h4>{" "}
                <p className="text-xs text-slate-500 font-semibold">
                  {" "}
                  Genera il file a larghezza fissa (.txt) da caricare per la
                  notifica delle schedine alloggiati.{" "}
                </p>{" "}
                <div className="flex gap-2">
                  {" "}
                  <input
                    type="date"
                    value={complianceDate}
                    onChange={(e) => setComplianceDate(e.target.value)}
                    className="glass-input flex-grow px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none"
                  />{" "}
                  <button
                    onClick={triggerAlloggiatiWebExport}
                    className="px-4 py-2 rounded-xl text-white font-bold bg-accent-500 hover:bg-accent-600 transition-all text-xs flex items-center gap-1 cursor-pointer"
                  >
                    {" "}
                    <Download className="w-3.5 h-3.5" /> Esporta TXT{" "}
                  </button>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Modal: Impostazioni Tassa di Soggiorno */}{" "}
      {showTouristTaxSettingsModal && (
        <TouristTaxSettingsModal
          onClose={() => setShowTouristTaxSettingsModal(false)}
        />
      )}{" "}
      {/* Camera Document Scanner Modal Overlay for Receptionist */}{" "}
      {showResScanner && (
        <DocumentScanner
          onScanSuccess={handleResOcrSuccess}
          onClose={() => setShowResScanner(false)}
        />
      )}{" "}
    </div>
  );
};
export default App;
