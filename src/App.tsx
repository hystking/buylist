import { useState, useEffect } from "react";
import {
  Button,
  Modal,
  Box,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Fab,
  ListItemButton,
  Snackbar,
  Alert,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";

const style = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: 400,
  maxHeight: "90vh",
  overflowY: "auto",
  bgcolor: "background.paper",
  borderRadius: 8,
  boxShadow: 24,
  p: 4,
};

interface Consumable {
  name: string;
  history: { action: string; datetime: string; quantity: number }[];
}

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [consumableName, setConsumableName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [selectedConsumable, setSelectedConsumable] =
    useState<Consumable | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );

  useEffect(() => {
    const storedConsumables = localStorage.getItem("consumables");
    if (storedConsumables) {
      setConsumables(JSON.parse(storedConsumables));
    }
  }, []);

  useEffect(() => {
    if (consumables.length === 0) {
      return;
    }
    localStorage.setItem("consumables", JSON.stringify(consumables));
  }, [consumables]);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);
  const handleRegister = () => {
    if (consumableName.trim()) {
      setConsumables([...consumables, { name: consumableName, history: [] }]);
      setConsumableName("");
      setIsModalOpen(false);
      setSnackbarMessage("消耗品を登録しました");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    }
  };

  const handleAction = (index: number, action: string, quantity: number) => {
    const newConsumables = [...consumables];
    newConsumables[index].history.push({
      action,
      datetime: new Date().toISOString(),
      quantity,
    });
    setConsumables(newConsumables);
    setIsDetailModalOpen(false);
    setSnackbarMessage("消耗品を購入しました");
    setSnackbarSeverity("success");
    setSnackbarOpen(true);
  };

  const handleDeleteConsumable = (index: number) => {
    if (window.confirm("本当にこの消耗品を削除しますか？")) {
      const newConsumables = consumables.filter((_, i) => i !== index);
      setConsumables(newConsumables);
      setIsDetailModalOpen(false);
      setSnackbarMessage("消耗品を削除しました");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    }
  };

  const handleDeleteHistory = (
    consumableIndex: number,
    historyIndex: number
  ) => {
    if (window.confirm("本当にこの履歴を削除しますか？")) {
      const newConsumables = [...consumables];
      newConsumables[consumableIndex].history.splice(historyIndex, 1);
      setConsumables(newConsumables);
      setSnackbarMessage("履歴を削除しました");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleOpenDetailModal = (consumable: Consumable) => {
    setSelectedConsumable(consumable);
    const lastPurchase = consumable.history
      .filter((h) => h.action === "complete")
      .pop();
    setQuantity(lastPurchase ? lastPurchase.quantity : 1);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => setIsDetailModalOpen(false);

  const getLastActionDate = (
    history: { action: string; datetime: string }[],
    action: string
  ) => {
    const lastAction = history.filter((h) => h.action === action).pop();
    return lastAction ? new Date(lastAction.datetime).toLocaleString() : "N/A";
  };

  const predictNextConsumptionDate = (
    history: { action: string; datetime: string; quantity: number }[]
  ) => {
    const intervals = [];
    for (let i = 1; i < history.length; i++) {
      const prevDate = new Date(history[i - 1].datetime);
      const currDate = new Date(history[i].datetime);
      const interval =
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24); // in days
      if (interval >= 1) {
        intervals.push({ interval, quantity: history[i - 1].quantity });
      }
    }

    if (intervals.length === 0) return "N/A";

    const weightedSum = intervals.reduce(
      (sum, { interval, quantity }) => sum + interval * quantity,
      0
    );
    const totalQuantity = intervals.reduce(
      (sum, { quantity }) => sum + quantity,
      0
    );
    const weightedAverage = weightedSum / totalQuantity;

    const lastPurchaseDate = new Date(history[history.length - 1].datetime);
    const nextConsumptionDate = new Date(
      lastPurchaseDate.getTime() + weightedAverage * 24 * 60 * 60 * 1000
    );

    return nextConsumptionDate;
  };

  const sortedConsumables = [...consumables].sort((a, b) => {
    const aNextDate = predictNextConsumptionDate(a.history);
    const bNextDate = predictNextConsumptionDate(b.history);
    return aNextDate === "N/A"
      ? 1
      : bNextDate === "N/A"
      ? -1
      : aNextDate.getTime() - bNextDate.getTime();
  });

  return (
    <>
      <Fab
        color="primary"
        aria-label="add"
        onClick={handleOpenModal}
        sx={{ position: "fixed", bottom: 16, right: 16 }}
      >
        <Add />
      </Fab>
      <List>
        {sortedConsumables.map((consumable, index) => (
          <ListItemButton
            key={index}
            onClick={() => handleOpenDetailModal(consumable)}
          >
            <ListItemText
              primary={consumable.name}
              secondary={`最終購入日時: ${getLastActionDate(
                consumable.history,
                "complete"
              )} | 次の消耗予測日時: ${
                predictNextConsumptionDate(consumable.history) === "N/A"
                  ? "N/A"
                  : predictNextConsumptionDate(
                      consumable.history
                    ).toLocaleString()
              }`}
            />
          </ListItemButton>
        ))}
      </List>
      <Modal open={isModalOpen} onClose={handleCloseModal}>
        <Box sx={style}>
          <Typography variant="h5" component="h2" gutterBottom>
            消耗品の登録
          </Typography>
          <TextField
            fullWidth
            label="消耗品名を入力"
            value={consumableName}
            onChange={(e) => setConsumableName(e.target.value)}
            margin="normal"
          />
          <Box mt={2} display="flex" justifyContent="space-between">
            <Button
              variant="contained"
              color="primary"
              onClick={handleRegister}
            >
              登録
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleCloseModal}
            >
              閉じる
            </Button>
          </Box>
        </Box>
      </Modal>
      <Modal open={isDetailModalOpen} onClose={handleCloseDetailModal}>
        <Box sx={style}>
          {selectedConsumable && (
            <>
              <Typography variant="h5" component="h2" gutterBottom>
                {selectedConsumable.name}
              </Typography>
              <Typography variant="body1" gutterBottom>
                次の消耗予測日時:{" "}
                {predictNextConsumptionDate(selectedConsumable.history) ===
                "N/A"
                  ? "N/A"
                  : predictNextConsumptionDate(
                      selectedConsumable.history
                    ).toLocaleString()}
              </Typography>
              <TextField
                fullWidth
                label="数量"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                margin="normal"
              />
              <Box mt={2} display="flex" justifyContent="space-between">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() =>
                    handleAction(
                      consumables.indexOf(selectedConsumable),
                      "complete",
                      quantity
                    )
                  }
                >
                  購入
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() =>
                    handleDeleteConsumable(
                      consumables.indexOf(selectedConsumable)
                    )
                  }
                >
                  削除
                </Button>
              </Box>
              {0 < selectedConsumable.history.length ? (
                <Divider sx={{ my: 2 }} />
              ) : null}

              <List>
                {[...selectedConsumable.history]
                  .reverse()
                  .map((entry, historyIndex) => (
                    <ListItem key={historyIndex}>
                      <ListItemText
                        primary={`${
                          entry.action === "complete" ? "購入" : entry.action
                        } - ${new Date(
                          entry.datetime
                        ).toLocaleString()} - 数量: ${entry.quantity}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() =>
                            handleDeleteHistory(
                              consumables.indexOf(selectedConsumable),
                              historyIndex
                            )
                          }
                        >
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
              </List>
            </>
          )}
        </Box>
      </Modal>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

export default App;
