import { Suspense } from "react";

import { Confirmacao } from "./Confirmacao";

export default function Confirmar() {
  return (
    <Suspense>
      <Confirmacao />
    </Suspense>
  );
}
