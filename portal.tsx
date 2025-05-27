import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    signInAnonymously,
    signInWithCustomToken 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs,
    Timestamp,
    onSnapshot 
} from 'firebase/firestore';
import { setLogLevel } from 'firebase/app'; // Importar setLogLevel

// --- Configuración de Firebase ---
// Estas variables globales se esperan en el entorno de Canvas.
const firebaseConfig = {
  apiKey: "AIzaSyDujxWW8EV3z1lmynUGlWY5tCCEEkKIqLs",
  authDomain: "portal-educativo-3e1cb.firebaseapp.com",
  projectId: "portal-educativo-3e1cb",
  storageBucket: "portal-educativo-3e1cb.firebasestorage.app",
  messagingSenderId: "933443658678",
  appId: "1:933443658678:web:311ad2e6c21178b6b01717"
};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setLogLevel('debug'); // Habilitar logs de Firebase para depuración

// --- Componentes de la UI (Estilo Tailwind CSS) ---

// Componente de Navegación
const Navbar = ({ user, handleLogout, setCurrentView, userRole }) => {
    return (
        <nav className="bg-gray-800 p-4 text-white shadow-md">
            <div className="container mx-auto flex justify-between items-center">
                <span className="text-xl font-bold cursor-pointer" onClick={() => setCurrentView(user ? (userRole === 'teacher' ? 'teacherDashboard' : 'studentDashboard') : 'login')}>Portal Educativo</span>
                <div className="space-x-4">
                    {user ? (
                        <>
                            <span className="text-sm">Hola, {user.email} ({userRole})</span>
                            <button onClick={() => setCurrentView(userRole === 'teacher' ? 'teacherDashboard' : 'studentDashboard')} className="hover:text-gray-300">Dashboard</button>
                            {userRole === 'teacher' && (
                                <button onClick={() => setCurrentView('createAssignment')} className="hover:text-gray-300">Crear Actividad</button>
                            )}
                            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded-md text-sm font-medium">Cerrar Sesión</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setCurrentView('login')} className="hover:text-gray-300">Iniciar Sesión</button>
                            <button onClick={() => setCurrentView('register')} className="hover:text-gray-300">Registrarse</button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

// Componente de Inicio de Sesión
const Login = ({ setCurrentView, handleLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await handleLogin(email, password);
            // El cambio de vista se maneja en App.js a través de onAuthStateChanged y userRole
        } catch (err) {
            setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
            console.error("Error de inicio de sesión:", err);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-3xl font-bold mb-6 text-center text-red-500">Iniciar Sesión</h2>
                {error && <p className="bg-red-700 text-white p-3 rounded-md mb-4 text-sm">{error}</p>}
                <form onSubmit={onSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="email">Correo Electrónico</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required className="shadow appearance-none border border-gray-700 rounded-md w-full py-3 px-4 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="password">Contraseña</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" required className="shadow appearance-none border border-gray-700 rounded-md w-full py-3 px-4 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-150 ease-in-out disabled:opacity-50">
                        {loading ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>
                <p className="mt-6 text-center text-sm text-gray-400">
                    ¿No tienes cuenta? <button onClick={() => setCurrentView('register')} className="font-medium text-red-500 hover:text-red-400">Regístrate aquí</button>
                </p>
            </div>
        </div>
    );
};

// Componente de Registro
const Register = ({ setCurrentView, handleRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Lógica para "correos especiales": si incluye @profesor.edu, es profesor.
    const determineRole = (email) => {
        return email.toLowerCase().includes('@profesor.edu') ? 'teacher' : 'student';
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const role = determineRole(email);
        try {
            await handleRegister(email, password, name, role);
             // El cambio de vista se maneja en App.js
        } catch (err) {
            setError(err.message || 'Error al registrarse. Intenta de nuevo.');
            console.error("Error de registro:", err);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-3xl font-bold mb-6 text-center text-red-500">Crear Cuenta</h2>
                {error && <p className="bg-red-700 text-white p-3 rounded-md mb-4 text-sm">{error}</p>}
                <form onSubmit={onSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="name">Nombre Completo</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu Nombre" required className="shadow appearance-none border border-gray-700 rounded-md w-full py-3 px-4 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="email">Correo Electrónico</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required className="shadow appearance-none border border-gray-700 rounded-md w-full py-3 px-4 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                        <p className="text-xs text-gray-500 mt-1">Si eres profesor, usa tu correo institucional (ej: nombre@profesor.edu).</p>
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="password">Contraseña</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required className="shadow appearance-none border border-gray-700 rounded-md w-full py-3 px-4 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-150 ease-in-out disabled:opacity-50">
                        {loading ? 'Registrando...' : 'Registrarse'}
                    </button>
                </form>
                <p className="mt-6 text-center text-sm text-gray-400">
                    ¿Ya tienes cuenta? <button onClick={() => setCurrentView('login')} className="font-medium text-red-500 hover:text-red-400">Inicia sesión</button>
                </p>
            </div>
        </div>
    );
};

// Componente Dashboard del Profesor
const TeacherDashboard = ({ user, setCurrentView, assignments, fetchAssignments }) => {
    useEffect(() => {
        if (user) {
            fetchAssignments();
        }
    }, [user, fetchAssignments]);
    
    return (
        <div className="container mx-auto p-6 bg-gray-900 text-white min-h-screen">
            <h2 className="text-3xl font-bold mb-6 text-red-500">Panel del Profesor</h2>
            <p className="mb-4 text-gray-300">Bienvenido, {user.displayName || user.email}. Aquí puedes administrar tus actividades.</p>
            <button onClick={() => setCurrentView('createAssignment')} className="mb-6 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md">
                Crear Nueva Actividad
            </button>
            
            <h3 className="text-2xl font-semibold mb-4 text-gray-200">Actividades Creadas</h3>
            {assignments.length === 0 ? (
                <p className="text-gray-400">Aún no has creado ninguna actividad.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignments.map(assignment => (
                        <div key={assignment.id} className="bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                            <h4 className="text-xl font-semibold mb-2 text-red-400">{assignment.title}</h4>
                            <p className="text-gray-400 mb-3 text-sm line-clamp-3">{assignment.description}</p>
                            <p className="text-xs text-gray-500 mb-1">Fecha de Entrega: {new Date(assignment.dueDate.seconds * 1000).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500">ID: {assignment.id}</p>
                            {/* Aquí podrías añadir un botón para ver entregas */}
                             <button 
                                onClick={() => setCurrentView('viewSubmissions', { assignmentId: assignment.id, assignmentTitle: assignment.title })} 
                                className="mt-3 text-sm bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md">
                                Ver Entregas
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Componente Dashboard del Estudiante
const StudentDashboard = ({ user, assignments, fetchAssignments, setCurrentView }) => {
     useEffect(() => {
        fetchAssignments(); // Los estudiantes ven todas las actividades
    }, [fetchAssignments]);

    return (
        <div className="container mx-auto p-6 bg-gray-900 text-white min-h-screen">
            <h2 className="text-3xl font-bold mb-6 text-red-500">Panel del Estudiante</h2>
            <p className="mb-4 text-gray-300">Bienvenido, {user.displayName || user.email}. Estas son tus actividades pendientes.</p>
            
            <h3 className="text-2xl font-semibold mb-4 text-gray-200">Actividades Asignadas</h3>
            {assignments.length === 0 ? (
                <p className="text-gray-400">No hay actividades asignadas por el momento.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignments.map(assignment => (
                        <div key={assignment.id} className="bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                            <h4 className="text-xl font-semibold mb-2 text-red-400">{assignment.title}</h4>
                            <p className="text-gray-400 mb-3 text-sm line-clamp-3">{assignment.description}</p>
                            <p className="text-xs text-gray-500 mb-3">Fecha de Entrega: {new Date(assignment.dueDate.seconds * 1000).toLocaleDateString()}</p>
                            <button 
                                onClick={() => setCurrentView('submitAssignment', { assignmentId: assignment.id, assignmentTitle: assignment.title })}
                                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md"
                            >
                                Ver y Entregar Actividad
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Componente para Crear Actividad
const CreateAssignment = ({ user, setCurrentView, handleCreateAssignment }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        if (!title || !description || !dueDate) {
            setError('Todos los campos son obligatorios.');
            setLoading(false);
            return;
        }
        try {
            await handleCreateAssignment(title, description, dueDate);
            setCurrentView('teacherDashboard');
        } catch (err) {
            setError(err.message || 'Error al crear la actividad.');
            console.error("Error creando actividad:", err);
        }
        setLoading(false);
    };
    
    return (
        <div className="container mx-auto p-6 bg-gray-900 text-white min-h-screen">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-lg mx-auto">
                <h2 className="text-3xl font-bold mb-6 text-center text-red-500">Crear Nueva Actividad</h2>
                {error && <p className="bg-red-700 text-white p-3 rounded-md mb-4 text-sm">{error}</p>}
                <form onSubmit={onSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="title">Título de la Actividad</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="shadow appearance-none border border-gray-700 rounded-md w-full py-3 px-4 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="description">Descripción</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="4" required className="shadow appearance-none border border-gray-700 rounded-md w-full py-3 px-4 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"></textarea>
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="dueDate">Fecha de Entrega</label>
                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="shadow appearance-none border border-gray-700 rounded-md w-full py-3 px-4 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                    </div>
                    <div className="flex items-center justify-between">
                        <button type="submit" disabled={loading} className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-150 ease-in-out disabled:opacity-50">
                            {loading ? 'Creando...' : 'Crear Actividad'}
                        </button>
                        <button type="button" onClick={() => setCurrentView('teacherDashboard')} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-150 ease-in-out">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Componente para Entregar Actividad (Estudiante)
const SubmitAssignment = ({ user, currentViewPayload, setCurrentView, handleSubmitAssignment }) => {
    const { assignmentId, assignmentTitle } = currentViewPayload;
    const [submissionText, setSubmissionText] = useState('');
    const [file, setFile] = useState(null); // Para futura subida de archivos
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        if (!submissionText) { // Por ahora solo texto
            setError('Debes escribir algo para tu entrega.');
            setLoading(false);
            return;
        }
        try {
            await handleSubmitAssignment(assignmentId, submissionText);
            setSuccess('¡Actividad entregada con éxito!');
            // Opcional: limpiar campos o redirigir
            setSubmissionText(''); 
            setTimeout(() => setCurrentView('studentDashboard'), 2000);
        } catch (err) {
            setError(err.message || 'Error al entregar la actividad.');
            console.error("Error entregando actividad:", err);
        }
        setLoading(false);
    };

    return (
        <div className="container mx-auto p-6 bg-gray-900 text-white min-h-screen">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-lg mx-auto">
                <h2 className="text-3xl font-bold mb-2 text-center text-red-500">Entregar Actividad</h2>
                <h3 className="text-xl font-semibold mb-6 text-center text-gray-300">{assignmentTitle}</h3>
                
                {error && <p className="bg-red-700 text-white p-3 rounded-md mb-4 text-sm">{error}</p>}
                {success && <p className="bg-green-700 text-white p-3 rounded-md mb-4 text-sm">{success}</p>}

                <form onSubmit={onSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="submissionText">Tu Respuesta/Entrega</label>
                        <textarea 
                            value={submissionText} 
                            onChange={(e) => setSubmissionText(e.target.value)} 
                            rows="6" 
                            required 
                            placeholder="Escribe aquí tu respuesta o un enlace a tu trabajo..."
                            className="shadow appearance-none border border-gray-700 rounded-md w-full py-3 px-4 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        ></textarea>
                    </div>
                    {/* Futuro: Input para subir archivos
                    <div className="mb-6">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="file">Adjuntar Archivo (Opcional)</label>
                        <input type="file" onChange={(e) => setFile(e.target.files[0])} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-500 file:text-white hover:file:bg-red-600"/>
                    </div>
                    */}
                    <div className="flex items-center justify-between">
                        <button type="submit" disabled={loading || success} className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-150 ease-in-out disabled:opacity-50">
                            {loading ? 'Entregando...' : 'Entregar Actividad'}
                        </button>
                        <button type="button" onClick={() => setCurrentView('studentDashboard')} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-150 ease-in-out">
                            Volver al Panel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Componente para Ver Entregas (Profesor)
const ViewSubmissions = ({ user, currentViewPayload, fetchSubmissionsForAssignment, setCurrentView }) => {
    const { assignmentId, assignmentTitle } = currentViewPayload;
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadSubmissions = async () => {
            setLoading(true);
            setError('');
            try {
                const fetchedSubmissions = await fetchSubmissionsForAssignment(assignmentId);
                setSubmissions(fetchedSubmissions);
            } catch (err) {
                console.error("Error fetching submissions:", err);
                setError("No se pudieron cargar las entregas.");
            }
            setLoading(false);
        };
        loadSubmissions();
    }, [assignmentId, fetchSubmissionsForAssignment]);

    if (loading) return <div className="text-center p-10 text-white">Cargando entregas...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-6 bg-gray-900 text-white min-h-screen">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold mb-2 text-center text-red-500">Entregas para:</h2>
                <h3 className="text-xl font-semibold mb-6 text-center text-gray-300">{assignmentTitle}</h3>

                {submissions.length === 0 ? (
                    <p className="text-gray-400 text-center">No hay entregas para esta actividad todavía.</p>
                ) : (
                    <ul className="space-y-4">
                        {submissions.map(sub => (
                            <li key={sub.id} className="bg-gray-700 p-4 rounded-md shadow">
                                <p className="text-sm text-gray-400"><strong>Estudiante ID:</strong> {sub.studentId} (En una app real, mostrar nombre)</p>
                                <p className="text-sm text-gray-400"><strong>Entregado:</strong> {new Date(sub.submittedDate.seconds * 1000).toLocaleString()}</p>
                                <p className="mt-2 text-gray-200 whitespace-pre-wrap"><strong>Respuesta:</strong> {sub.submissionText}</p>
                                {/* Aquí se podría añadir un campo para calificar */}
                            </li>
                        ))}
                    </ul>
                )}
                 <button 
                    onClick={() => setCurrentView('teacherDashboard')} 
                    className="mt-8 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-150 ease-in-out">
                    Volver al Panel
                </button>
            </div>
        </div>
    );
};


// Componente Principal App
function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null); // 'teacher', 'student', or null
    const [currentView, setCurrentView] = useState('login'); // login, register, teacherDashboard, studentDashboard, createAssignment, submitAssignment, viewSubmissions
    const [currentViewPayload, setCurrentViewPayload] = useState(null); // Para pasar datos entre vistas, ej: assignmentId
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [assignments, setAssignments] = useState([]); // Para actividades

    const [fbApp, setFbApp] = useState(null);
    const [fbAuth, setFbAuth] = useState(null);
    const [fbDb, setFbDb] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);


    useEffect(() => {
        // Inicialización de Firebase y Auth Listener
        const appInstance = initializeApp(firebaseConfig);
        setFbApp(appInstance);
        const authInstance = getAuth(appInstance);
        setFbAuth(authInstance);
        const dbInstance = getFirestore(appInstance);
        setFbDb(dbInstance);
        setLogLevel('debug');

        const attemptSignIn = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    console.log("Attempting sign in with custom token.");
                    await signInWithCustomToken(authInstance, __initial_auth_token);
                } else {
                    console.log("No custom token, attempting anonymous sign in for initial auth check.");
                    await signInAnonymously(authInstance); // Esto es solo para que onAuthStateChanged se active.
                                                            // Si no hay usuario real, se tratará como deslogueado.
                }
            } catch (error) {
                console.error("Error during initial sign-in attempt:", error);
                 // Si falla el token personalizado o anónimo, onAuthStateChanged manejará user=null
            }
        };
        attemptSignIn();


        const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
            setLoadingAuth(true);
            if (user && !user.isAnonymous) { // Ignorar el usuario anónimo de inicialización
                setCurrentUser(user);
                setUserId(user.uid);
                // Obtener rol del usuario desde Firestore
                const userDocRef = doc(dbInstance, `/artifacts/${appId}/users/${user.uid}`);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUserRole(userData.role);
                    setCurrentView(userData.role === 'teacher' ? 'teacherDashboard' : 'studentDashboard');
                } else {
                    // Esto podría pasar si el registro no completó la creación del doc en Firestore
                    // O si es un usuario antiguo sin rol. Por ahora, desloguear.
                    console.warn("Usuario autenticado pero sin documento de rol en Firestore. Deslogueando.");
                    await signOut(authInstance);
                    setUserRole(null);
                    setCurrentUser(null);
                    setUserId(null);
                    setCurrentView('login');
                }
            } else {
                // Si es anónimo o no hay usuario, desloguear al anónimo si existe y resetear estado
                if (authInstance.currentUser && authInstance.currentUser.isAnonymous) {
                    await signOut(authInstance); // Desloguear al usuario anónimo
                }
                setCurrentUser(null);
                setUserRole(null);
                setUserId(null);
                setCurrentView('login');
            }
            setLoadingAuth(false);
            setIsAuthReady(true); // Marcar que la autenticación inicial ha terminado
        });
        return () => unsubscribe(); // Limpiar al desmontar
    }, []);


    // --- Funciones de Autenticación ---
    const handleLogin = async (email, password) => {
        if (!fbAuth) throw new Error("Firebase Auth no inicializado.");
        return signInWithEmailAndPassword(fbAuth, email, password);
    };

    const handleRegister = async (email, password, name, role) => {
        if (!fbAuth || !fbDb) throw new Error("Firebase no inicializado.");
        const userCredential = await createUserWithEmailAndPassword(fbAuth, email, password);
        const user = userCredential.user;
        // Guardar información adicional del usuario (rol, nombre) en Firestore
        const userDocRef = doc(fbDb, `/artifacts/${appId}/users/${user.uid}`);
        await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: name,
            role: role,
            createdAt: Timestamp.now()
        });
        // El estado (currentUser, userRole) se actualizará mediante onAuthStateChanged
        return userCredential;
    };

    const handleLogout = async () => {
        if (!fbAuth) return;
        await signOut(fbAuth);
        // onAuthStateChanged se encargará de resetear currentUser, userRole y currentView
    };

    // --- Funciones de Firestore para Actividades ---
    const assignmentsCollectionPath = `/artifacts/${appId}/public/data/assignments`;

    const fetchAssignments = useCallback(async () => {
        if (!fbDb || !isAuthReady) return; // Asegurarse que db y auth estén listos
        
        // Los estudiantes ven todas las actividades, los profesores solo las suyas (o todas si así se decide)
        // Por simplicidad, por ahora todos ven todas las actividades.
        // Se podría filtrar por teacherId si userRole es 'teacher'
        const q = query(collection(fbDb, assignmentsCollectionPath)); // order By dueDate or createdAt
        
        // Usar onSnapshot para actualizaciones en tiempo real
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const assignmentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAssignments(assignmentsData);
        }, (error) => {
            console.error("Error fetching assignments: ", error);
        });
        return unsubscribe; // Devolver para limpiar en useEffect si es necesario
    }, [fbDb, isAuthReady, userRole, currentUser]);


    const handleCreateAssignment = async (title, description, dueDate) => {
        if (!fbDb || !currentUser || userRole !== 'teacher') {
            throw new Error("No autorizado o Firebase no listo.");
        }
        const newAssignment = {
            title,
            description,
            dueDate: Timestamp.fromDate(new Date(dueDate)),
            teacherId: currentUser.uid,
            teacherEmail: currentUser.email, // Opcional, para referencia
            createdAt: Timestamp.now()
        };
        const docRef = await addDoc(collection(fbDb, assignmentsCollectionPath), newAssignment);
        console.log("Actividad creada con ID: ", docRef.id);
        fetchAssignments(); // Actualizar lista
    };

    // --- Funciones de Firestore para Entregas ---
    const handleSubmitAssignment = async (assignmentId, submissionText) => {
        if (!fbDb || !currentUser || userRole !== 'student') {
            throw new Error("No autorizado o Firebase no listo.");
        }
        const submissionPath = `/artifacts/${appId}/public/data/assignments/${assignmentId}/submissions`;
        const newSubmission = {
            assignmentId,
            studentId: currentUser.uid,
            studentEmail: currentUser.email, // Opcional
            submissionText,
            // fileURL: null, // Para futura subida de archivos
            submittedDate: Timestamp.now(),
            // grade: null // Para futura calificación
        };
        // Usar studentId como ID del documento para fácil consulta y evitar duplicados por estudiante
        const submissionDocRef = doc(fbDb, submissionPath, currentUser.uid); 
        await setDoc(submissionDocRef, newSubmission); // setDoc para sobrescribir si ya existe una entrega
        console.log("Entrega realizada para actividad ID: ", assignmentId);
    };
    
    const fetchSubmissionsForAssignment = useCallback(async (assignmentId) => {
        if (!fbDb || !isAuthReady || userRole !== 'teacher') {
            console.warn("fetchSubmissionsForAssignment: Requisitos no cumplidos.");
            return [];
        }
        const submissionsPath = `/artifacts/${appId}/public/data/assignments/${assignmentId}/submissions`;
        const q = query(collection(fbDb, submissionsPath));
        
        const querySnapshot = await getDocs(q);
        const submissionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return submissionsData;
    }, [fbDb, isAuthReady, userRole]);


    // Efecto para cargar actividades cuando el rol del usuario cambia o se autentica
    useEffect(() => {
        if (currentUser && userRole && isAuthReady) {
            const unsubscribe = fetchAssignments();
            return () => {
                if (unsubscribe && typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            };
        }
    }, [currentUser, userRole, isAuthReady, fetchAssignments]);


    const setView = (view, payload = null) => {
        setCurrentView(view);
        setCurrentViewPayload(payload);
    }

    if (loadingAuth || !isAuthReady) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white text-xl">Cargando Portal...</div>;
    }
    
    const renderView = () => {
        switch (currentView) {
            case 'login':
                return <Login setCurrentView={setView} handleLogin={handleLogin} />;
            case 'register':
                return <Register setCurrentView={setView} handleRegister={handleRegister} />;
            case 'teacherDashboard':
                return currentUser && userRole === 'teacher' ? <TeacherDashboard user={currentUser} setCurrentView={setView} assignments={assignments} fetchAssignments={fetchAssignments} /> : <Login setCurrentView={setView} handleLogin={handleLogin} />;
            case 'studentDashboard':
                return currentUser && userRole === 'student' ? <StudentDashboard user={currentUser} assignments={assignments} fetchAssignments={fetchAssignments} setCurrentView={setView} /> : <Login setCurrentView={setView} handleLogin={handleLogin} />;
            case 'createAssignment':
                return currentUser && userRole === 'teacher' ? <CreateAssignment user={currentUser} setCurrentView={setView} handleCreateAssignment={handleCreateAssignment} /> : <Login setCurrentView={setView} handleLogin={handleLogin} />;
            case 'submitAssignment':
                 return currentUser && userRole === 'student' && currentViewPayload ? <SubmitAssignment user={currentUser} currentViewPayload={currentViewPayload} setCurrentView={setView} handleSubmitAssignment={handleSubmitAssignment} /> : <Login setCurrentView={setView} handleLogin={handleLogin} />;
            case 'viewSubmissions':
                return currentUser && userRole === 'teacher' && currentViewPayload ? <ViewSubmissions user={currentUser} currentViewPayload={currentViewPayload} fetchSubmissionsForAssignment={fetchSubmissionsForAssignment} setCurrentView={setView} /> : <Login setCurrentView={setView} handleLogin={handleLogin} />;
            default:
                return <Login setCurrentView={setView} handleLogin={handleLogin} />;
        }
    };

    return (
        <div className="bg-gray-900 min-h-screen">
            <Navbar user={currentUser} handleLogout={handleLogout} setCurrentView={setView} userRole={userRole} />
            {renderView()}
        </div>
    );
}

export default App;

