import React, { useEffect, useState } from 'react';

interface AcademicStaff {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface AcademicStaffViewProps {
  token: string;
  onEditClick?: (user: AcademicStaff) => void;
  onBackClick?: () => void;
  onAddClick?: () => void;
}

export const AcademicStaffView: React.FC<AcademicStaffViewProps> = ({ 
  token, 
  onEditClick, 
  onBackClick, 
  onAddClick 
}) => {
  const [staffList, setStaffList] = useState<AcademicStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://127.0.0.1:8000/api/academic-staff', {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || 'Error al obtener personal');
        setStaffList(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [token]);

  const formatRole = (role: string) => {
    const r = role.toUpperCase();
    if (r === 'ADMIN' || r === 'ADMINISTRADOR') return 'Administrador';
    if (r === 'TEACHER' || r === 'DOCENTE') return 'Docente';
    if (r === 'ASSISTANT' || r === 'AUXILIAR') return 'Auxiliar';
    return role;
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#666', fontFamily: 'sans-serif' }}>Cargando personal académico...</div>;
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: '#d9534f', fontFamily: 'sans-serif' }}>Error: {error}</div>;

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#fff', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button 
          onClick={onBackClick}
          style={{ background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#111', padding: 0 }}
        >
          ←
        </button>
        <button 
          onClick={onAddClick}
          style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#111', fontWeight: '300', padding: 0 }}
        >
          +
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ 
          width: '82px', 
          height: '68px', 
          margin: '0 auto 16px auto', 
          filter: 'drop-shadow(0 14px 20px rgba(59, 130, 246, 0.35))'
        }}>
          <svg viewBox="0 0 80 68" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
            <path d="M8 14C8 10.6863 10.6863 8 14 8H32C34.1217 8 36.1571 8.84285 37.6569 10.3431L41.3431 14.0294C42.8429 15.5292 44.8783 16.372 47 16.372H68C71.3137 16.372 74 19.0583 74 22.372V54C74 57.3137 71.3137 60 68 60H14C10.6863 60 8 57.3137 8 54V14Z" fill="url(#folder_back)" fillOpacity="0.85" />
            <path d="M8 22H74V54C74 57.3137 71.3137 60 68 60H14C10.6863 60 8 57.3137 8 54V22Z" fill="url(#folder_front)" fillOpacity="0.9" />
            <path d="M10 24H72V54C72 56.2091 70.2091 58 68 58H14C11.7909 58 10 56.2091 10 54V24Z" fill="white" fillOpacity="0.22" />
            
            <defs>
              <linearGradient id="folder_back" x1="41" y1="8" x2="41" y2="60" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3b82f6" />
                <stop offset="1" stopColor="#1d4ed8" />
              </linearGradient>
              <linearGradient id="folder_front" x1="41" y1="22" x2="41" y2="60" gradientUnits="userSpaceOnUse">
                <stop stopColor="#60a5fa" />
                <stop offset="1" stopColor="#2563eb" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#111', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>Personal Académico</h1>
        <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>{staffList.length} usuarios</p>
      </div>

      {/* Tabla de usuarios */}
      <div style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 75px', padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#888', borderBottom: '1px solid #eaeaea' }}>
          <div>rol</div>
          <div>nombre</div>
          <div style={{ textAlign: 'right' }}></div>
        </div>

        {staffList.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>No hay usuarios registrados.</div>
        ) : (
          staffList.map((user, index) => {
            const isEven = index % 2 === 0;
            return (
              <div 
                key={user.id} 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '120px 1fr 75px', 
                  padding: '10px 12px', 
                  fontSize: '13px', 
                  alignItems: 'center',
                  background: isEven ? '#f8fafc' : '#ffffff',
                  borderRadius: '6px',
                  marginBottom: '2px'
                }}
              >
                <div style={{ color: '#4b5563', fontWeight: '500' }}>{formatRole(user.role)}</div>
                <div style={{ color: '#111827', fontWeight: '400', paddingRight: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.full_name}</div>
                <div style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => onEditClick?.(user)}
                    style={{
                      background: 'transparent',
                      color: '#111111',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '400',
                      padding: 0
                    }}
                  >
                    Editar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};