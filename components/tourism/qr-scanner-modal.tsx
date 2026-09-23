import { CameraView } from "expo-camera";
import { Modal, Text, TouchableOpacity, View } from "react-native";

type CameraPermission = {
  granted: boolean;
} | null;

type QrScannerModalProps = {
  visible: boolean;
  cameraPermission: CameraPermission;
  scannerAtivo: boolean;
  onRequestPermission: () => Promise<unknown>;
  onQrCodeRead: (data: string) => void;
  onClose: () => void;
  onTryAgain?: () => void;
  instruction?: string;
  errorMessage?: string;
};

export function QrScannerModal({
  visible,
  cameraPermission,
  scannerAtivo,
  onRequestPermission,
  onQrCodeRead,
  onClose,
  onTryAgain,
  instruction = "Escaneie o QR Code do local selecionado.",
  errorMessage,
}: QrScannerModalProps) {
  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, backgroundColor: "black" }}>
        {!cameraPermission ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <Text style={{ color: "white" }}>Carregando câmera...</Text>
          </View>
        ) : !cameraPermission.granted ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              O app precisa da câmera para escanear o QR Code do local.
            </Text>

            <TouchableOpacity
              onPress={onRequestPermission}
              style={{
                backgroundColor: "white",
                padding: 12,
                borderRadius: 12,
                marginTop: 16,
              }}
            >
              <Text style={{ color: "black", fontWeight: "bold" }}>
                Permitir câmera
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={
              scannerAtivo
                ? (result) => {
                    onQrCodeRead(result.data);
                  }
                : undefined
            }
          />
        )}

        <View
          style={{
            position: "absolute",
            left: 24,
            right: 24,
            bottom: 40,
            backgroundColor: "rgba(0,0,0,0.75)",
            padding: 16,
            borderRadius: 16,
          }}
        >
          {errorMessage ? (
            <View
              style={{
                backgroundColor: "#471b24",
                borderColor: "#ff8a98",
                borderRadius: 12,
                borderWidth: 1,
                marginBottom: 12,
                padding: 12,
              }}
            >
              <Text style={{ color: "#ffd9de", fontWeight: "800", textAlign: "center" }}>
                {errorMessage}
              </Text>
              {onTryAgain ? (
                <TouchableOpacity
                  onPress={onTryAgain}
                  style={{
                    alignItems: "center",
                    backgroundColor: "#7046ee",
                    borderRadius: 10,
                    marginTop: 11,
                    padding: 11,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "900" }}>Tentar novamente</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <Text style={{ color: "white", textAlign: "center", marginBottom: 12 }}>
            {instruction}
          </Text>

          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: "white",
              padding: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "black", textAlign: "center" }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
