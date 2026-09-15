import { FormEvent, useEffect, useState } from "react";
import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  UserRound,
  WalletCards,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import EmptyState from "../components/ui/EmptyState";
import {
  AccommodationFolio,
  AccommodationReservation,
  AccommodationRoom,
  AccommodationRoomType,
  checkInAccommodation,
  checkOutAccommodation,
  createAccommodationReservation,
  getAccommodationFolios,
  getAccommodationHousekeeping,
  getAccommodationReservations,
  getAccommodationRoomTypes,
  getAccommodationRooms,
  getStoreInfo,
  updateAccommodationHousekeeping,
  updateAccommodationRoom,
  updateAccommodationRoomType,
} from "../services/api";

export type AccommodationMode = "reservations" | "checkins" | "rooms";

interface Props {
  mode: AccommodationMode;
}

const money = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function dateOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

const panelStyle = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: 18,
};

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function statusTone(status: string) {
  if (
    ["vacant", "clean", "inspected", "completed", "settled"].includes(status)
  ) {
    return "status-badge--open";
  }
  if (["reserved", "in_progress", "confirmed", "tentative"].includes(status)) {
    return "status-badge--suspended";
  }
  if (
    ["occupied", "dirty", "blocked", "out_of_order", "cancelled"].includes(
      status,
    )
  ) {
    return "status-badge--closed";
  }
  return "status-badge--none";
}

export default function AccommodationPage({ mode }: Props) {
  const [storeId, setStoreId] = useState("default-store");
  const [roomTypes, setRoomTypes] = useState<AccommodationRoomType[]>([]);
  const [rooms, setRooms] = useState<AccommodationRoom[]>([]);
  const [reservations, setReservations] = useState<AccommodationReservation[]>(
    [],
  );
  const [folios, setFolios] = useState<AccommodationFolio[]>([]);
  const [housekeeping, setHousekeeping] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [roomTypeId, setRoomTypeId] = useState(0);
  const [roomId, setRoomId] = useState(0);
  const [checkInDate, setCheckInDate] = useState(dateOffset(1));
  const [checkOutDate, setCheckOutDate] = useState(dateOffset(2));
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [typeForm, setTypeForm] = useState({ code: "", name: "", capacity: 2, baseRate: 0 });
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [roomForm, setRoomForm] = useState({ roomNumber: "", floor: "", roomTypeId: 0 });
  const [savingEdit, setSavingEdit] = useState(false);

  async function load(currentStoreId = storeId) {
    setLoading(true);
    setError(null);
    try {
      const [types, roomRows, reservationRows, folioRows, taskRows] =
        await Promise.all([
          getAccommodationRoomTypes(currentStoreId),
          getAccommodationRooms(currentStoreId),
          getAccommodationReservations(currentStoreId),
          getAccommodationFolios(currentStoreId),
          getAccommodationHousekeeping(currentStoreId),
        ]);
      setRoomTypes(types);
      setRooms(roomRows);
      setReservations(reservationRows);
      setFolios(folioRows);
      setHousekeeping(taskRows);
      if (!roomTypeId && types[0]) setRoomTypeId(types[0].id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat data akomodasi",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getStoreInfo()
      .then((info) => {
        if (!active) return;
        setStoreId(info.storeId);
        return load(info.storeId);
      })
      .catch(() => load())
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Gagal memuat data"),
      );
    return () => {
      active = false;
    };
  }, [mode]);

  async function submitReservation(event: FormEvent) {
    event.preventDefault();
    if (!roomTypeId || !guestName.trim()) return;
    try {
      await createAccommodationReservation({
        storeId,
        roomTypeId,
        roomId: roomId || undefined,
        checkInDate,
        checkOutDate,
        guests: [{ name: guestName.trim(), isPrimary: true }],
        source: "direct",
      });
      setGuestName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reservasi gagal dibuat");
    }
  }

  async function doCheckIn(reservation: AccommodationReservation) {
    if (!reservation.room) {
      setError("Reservasi ini belum memiliki kamar");
      return;
    }
    try {
      await checkInAccommodation({
        storeId,
        reservationId: reservation.id,
        roomId: reservation.room.id,
        guestName: reservation.guests[0]?.name,
        checkedInBy: "front-office",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in gagal");
    }
  }

  async function doCheckOut(folio: AccommodationFolio) {
    if (!folio.stay || folio.balance_due > 0) return;
    try {
      await checkOutAccommodation(folio.stay.id, storeId, "front-office");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-out gagal");
    }
  }

  async function completeHousekeeping(id: number) {
    try {
      await updateAccommodationHousekeeping(id, "completed", storeId);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Housekeeping gagal diperbarui",
      );
    }
  }

  function beginTypeEdit(type: AccommodationRoomType) {
    setEditingTypeId(type.id);
    setTypeForm({ code: type.code, name: type.name, capacity: type.capacity, baseRate: type.base_rate });
  }

  async function saveTypeEdit() {
    if (!editingTypeId || !typeForm.code.trim() || !typeForm.name.trim()) return;
    setSavingEdit(true);
    try {
      await updateAccommodationRoomType(editingTypeId, typeForm, storeId);
      setEditingTypeId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tipe kamar gagal diperbarui");
    } finally {
      setSavingEdit(false);
    }
  }

  function beginRoomEdit(room: AccommodationRoom) {
    setEditingRoomId(room.id);
    setRoomForm({ roomNumber: room.room_number, floor: room.floor ?? "", roomTypeId: room.room_type.id });
  }

  async function saveRoomEdit() {
    if (!editingRoomId || !roomForm.roomNumber.trim() || !roomForm.roomTypeId) return;
    setSavingEdit(true);
    try {
      await updateAccommodationRoom(editingRoomId, roomForm, storeId);
      setEditingRoomId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kamar gagal diperbarui");
    } finally {
      setSavingEdit(false);
    }
  }

  const title =
    mode === "rooms"
      ? "Kamar & Tipe Kamar"
      : mode === "checkins"
        ? "Check-in / Check-out"
        : "Reservasi Kamar";
  const activeReservations = reservations.filter((row) =>
    ["confirmed", "tentative"].includes(row.status),
  );
  const activeFolios = folios.filter(
    (row) => row.status === "open" && row.stay,
  );
  const occupiedRooms = rooms.filter(
    (room) => room.status === "occupied",
  ).length;
  const reservedRooms = rooms.filter(
    (room) => room.status === "reserved",
  ).length;
  const pendingTasks = housekeeping.filter(
    (task) => task.status !== "completed",
  ).length;
  const openBalance = activeFolios.reduce(
    (sum, folio) => sum + folio.balance_due,
    0,
  );

  return (
    <PosAppShell title={title}>
      {error && (
        <div
          style={{
            ...panelStyle,
            borderColor: "var(--danger)",
            color: "var(--danger)",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <div className="summary-grid" style={{ marginBottom: 18 }}>
        <div className="summary-card">
          <div className="summary-card-label">
            <BedDouble size={15} /> Kamar terisi
          </div>
          <div className="summary-card-value">
            {occupiedRooms}
            <span
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              {" "}
              / {rooms.length}
            </span>
          </div>
          <div className="summary-card-sub">
            {reservedRooms} kamar sudah direservasi
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <CalendarDays size={15} /> Reservasi aktif
          </div>
          <div className="summary-card-value">{activeReservations.length}</div>
          <div className="summary-card-sub">
            Booking yang menunggu kedatangan
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <ClipboardCheck size={15} /> Housekeeping
          </div>
          <div className="summary-card-value">{pendingTasks}</div>
          <div className="summary-card-sub">Tugas belum selesai</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <WalletCards size={15} /> Saldo folio
          </div>
          <div className="summary-card-value" style={{ fontSize: 20 }}>
            {money.format(openBalance)}
          </div>
          <div className="summary-card-sub">
            Dari {activeFolios.length} folio terbuka
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-center" style={{ minHeight: 280 }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {mode === "reservations" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
                gap: 16,
              }}
            >
              <form onSubmit={submitReservation} style={panelStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    marginBottom: 18,
                  }}
                >
                  <UserRound size={18} color="var(--primary)" />
                  <h2 style={{ margin: 0, fontSize: 17 }}>Booking baru</h2>
                </div>
                <label className="form-label">Nama tamu</label>
                <input
                  className="form-input"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="Nama tamu utama"
                  required
                />
                <label className="form-label">Tipe kamar</label>
                <select
                  className="form-input"
                  value={roomTypeId}
                  onChange={(event) => {
                    setRoomTypeId(Number(event.target.value));
                    setRoomId(0);
                  }}
                >
                  {roomTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} · {money.format(type.base_rate)}
                    </option>
                  ))}
                </select>
                <label className="form-label">
                  Nomor kamar{" "}
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                    (opsional)
                  </span>
                </label>
                <select
                  className="form-input"
                  value={roomId}
                  onChange={(event) => setRoomId(Number(event.target.value))}
                >
                  <option value={0}>Assign nanti saat reservasi</option>
                  {rooms
                    .filter(
                      (room) =>
                        room.room_type.id === roomTypeId &&
                        ["vacant", "clean", "inspected"].includes(room.status),
                    )
                    .map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.room_number} · {statusLabel(room.status)}
                      </option>
                    ))}
                </select>
                <label className="form-label">Check-in</label>
                <input
                  className="form-input"
                  type="date"
                  value={checkInDate}
                  onChange={(event) => setCheckInDate(event.target.value)}
                  required
                />
                <label className="form-label">Check-out</label>
                <input
                  className="form-input"
                  type="date"
                  value={checkOutDate}
                  onChange={(event) => setCheckOutDate(event.target.value)}
                  required
                />
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={loading}
                  style={{ width: "100%", marginTop: 8 }}
                >
                  Buat reservasi
                </button>
              </form>
              <section style={panelStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17 }}>
                      Booking mendatang
                    </h2>
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      Kelola kedatangan dan penempatan kamar
                    </span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => load()}
                    title="Muat ulang"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="pos-data-table">
                    <thead>
                      <tr>
                        <th>Reservasi</th>
                        <th>Tamu</th>
                        <th>Kamar</th>
                        <th>Periode</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {activeReservations.map((reservation) => (
                        <tr key={reservation.id}>
                          <td>{reservation.reservation_number}</td>
                          <td>
                            {reservation.guests[0]?.name ??
                              reservation.customer?.name ??
                              "-"}
                          </td>
                          <td>
                            {reservation.room?.room_number ?? "Belum assign"}
                          </td>
                          <td>
                            {reservation.check_in_date} →{" "}
                            {reservation.check_out_date}
                          </td>
                          <td>
                            <span
                              className={`status-badge ${statusTone(reservation.status)}`}
                            >
                              {statusLabel(reservation.status)}
                            </span>
                          </td>
                          <td>
                            {reservation.status === "confirmed" && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => doCheckIn(reservation)}
                              >
                                Check-in
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!activeReservations.length && (
                  <EmptyState
                    icon={<CalendarDays size={28} />}
                    title="Belum ada reservasi aktif"
                    description="Booking baru akan muncul di sini."
                    compact
                  />
                )}
              </section>
            </div>
          )}

          {mode === "rooms" && (
            <div style={{ display: "grid", gap: 16 }}>
            <section style={panelStyle}>
              <div style={{ marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 17 }}>Tipe kamar</h2>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Harga dan kapasitas per kategori</span>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {roomTypes.map((type) => editingTypeId === type.id ? (
                  <div key={type.id} style={{ display: "grid", gridTemplateColumns: "110px minmax(140px, 1fr) 100px 150px auto", gap: 8, alignItems: "end" }}>
                    <label className="form-label">Kode<input className="form-input" value={typeForm.code} onChange={(event) => setTypeForm({ ...typeForm, code: event.target.value })} /></label>
                    <label className="form-label">Nama<input className="form-input" value={typeForm.name} onChange={(event) => setTypeForm({ ...typeForm, name: event.target.value })} /></label>
                    <label className="form-label">Kapasitas<input className="form-input" type="number" min="1" value={typeForm.capacity} onChange={(event) => setTypeForm({ ...typeForm, capacity: Number(event.target.value) })} /></label>
                    <label className="form-label">Harga/malam<input className="form-input" type="number" min="0" value={typeForm.baseRate} onChange={(event) => setTypeForm({ ...typeForm, baseRate: Number(event.target.value) })} /></label>
                    <div style={{ display: "flex", gap: 6 }}><button className="btn btn-primary btn-sm" disabled={savingEdit} onClick={saveTypeEdit}>Simpan</button><button className="btn btn-ghost btn-sm" onClick={() => setEditingTypeId(null)}>Batal</button></div>
                  </div>
                ) : (
                  <div key={type.id} style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
                    <strong style={{ minWidth: 54 }}>{type.code}</strong><span style={{ flex: 1 }}>{type.name}</span><span style={{ color: "var(--text-muted)" }}>{type.capacity} tamu</span><strong>{money.format(type.base_rate)}</strong><button className="btn btn-ghost btn-sm" onClick={() => beginTypeEdit(type)}>Edit</button>
                  </div>
                ))}
              </div>
            </section>
            <section style={panelStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: 17 }}>Room board</h2>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    Edit nomor, lantai, dan tipe kamar
                  </span>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => load()}
                  title="Muat ulang"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                {rooms.map((room) => editingRoomId === room.id ? (
                  <div key={room.id} style={{ border: "1px solid var(--primary)", borderRadius: 8, padding: 12, display: "grid", gap: 7 }}>
                    <input className="form-input" value={roomForm.roomNumber} onChange={(event) => setRoomForm({ ...roomForm, roomNumber: event.target.value })} aria-label="Nomor kamar" />
                    <input className="form-input" value={roomForm.floor} onChange={(event) => setRoomForm({ ...roomForm, floor: event.target.value })} placeholder="Lantai" aria-label="Lantai" />
                    <select className="form-input" value={roomForm.roomTypeId} onChange={(event) => setRoomForm({ ...roomForm, roomTypeId: Number(event.target.value) })} aria-label="Tipe kamar">{roomTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select>
                    <div style={{ display: "flex", gap: 6 }}><button className="btn btn-primary btn-sm" disabled={savingEdit} onClick={saveRoomEdit}>Simpan</button><button className="btn btn-ghost btn-sm" onClick={() => setEditingRoomId(null)}>Batal</button></div>
                  </div>
                ) : (
                  <div
                    key={room.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: 14,
                      position: "relative",
                    }}
                  >
                    <button className="btn btn-ghost btn-sm" style={{ position: "absolute", top: 8, right: 8 }} onClick={() => beginRoomEdit(room)}>Edit</button>
                    <strong>{room.room_number}</strong>
                    <div
                      style={{
                        color: "var(--text-secondary)",
                        margin: "6px 0",
                      }}
                    >
                      {room.room_type.name}
                    </div>
                    <span className={`status-badge ${statusTone(room.status)}`}>
                      {statusLabel(room.status)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            </div>
          )}

          {mode === "checkins" && (
            <div style={{ display: "grid", gap: 16 }}>
              <section style={panelStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17 }}>Tamu menginap</h2>
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      Folio dan proses check-out
                    </span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => load()}
                    title="Muat ulang"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="pos-data-table">
                    <thead>
                      <tr>
                        <th>Folio</th>
                        <th>Kamar</th>
                        <th>Total</th>
                        <th>Saldo</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {activeFolios.map((folio) => (
                        <tr key={folio.id}>
                          <td>{folio.folio_number}</td>
                          <td>{folio.stay?.room.room_number}</td>
                          <td>{money.format(folio.total)}</td>
                          <td>{money.format(folio.balance_due)}</td>
                          <td>
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={folio.balance_due > 0}
                              onClick={() => doCheckOut(folio)}
                            >
                              Check-out
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!activeFolios.length && (
                  <EmptyState
                    icon={<UserRound size={28} />}
                    title="Tidak ada tamu aktif"
                    description="Tamu yang check-in akan muncul di sini."
                    compact
                  />
                )}
              </section>
              <section style={panelStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17 }}>Housekeeping</h2>
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      Kamar yang perlu ditangani
                    </span>
                  </div>
                  <span
                    className={`status-badge ${pendingTasks ? "status-badge--suspended" : "status-badge--open"}`}
                  >
                    {pendingTasks} tugas
                  </span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="pos-data-table">
                    <thead>
                      <tr>
                        <th>Kamar</th>
                        <th>Tugas</th>
                        <th>Prioritas</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {housekeeping.map((task) => (
                        <tr key={task.id}>
                          <td>{task.room.room_number}</td>
                          <td>{task.task_type}</td>
                          <td>{task.priority}</td>
                          <td>
                            <span
                              className={`status-badge ${statusTone(task.status)}`}
                            >
                              {statusLabel(task.status)}
                            </span>
                          </td>
                          <td>
                            {task.status !== "completed" && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => completeHousekeeping(task.id)}
                              >
                                Tandai bersih
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!housekeeping.length && (
                  <EmptyState
                    icon={<CheckCircle2 size={28} />}
                    title="Housekeeping terkendali"
                    description="Belum ada tugas yang perlu dikerjakan."
                    compact
                  />
                )}
              </section>
            </div>
          )}
        </>
      )}
    </PosAppShell>
  );
}
