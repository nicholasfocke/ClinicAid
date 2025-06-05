import Image from "next/image";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { useRouter } from "next/router";

export default function IndexCliente() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <h1>Página do Cliente</h1>
      <Image src="/images/ClinicAid logo ajustado.png" alt="Logo ClinicAid" width={270} height={70} priority />
      <p>Esta é a página principal do cliente apenas para teste de rota.</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
