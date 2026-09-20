export type SendFlowTarget = {
  rule: string;
  customerId: string;
  vehicleId: string;
  customerName: string;
  plate: string;
};

export type SendFlowLocationState = {
  reopenSend?: SendFlowTarget;
  fromSend?: SendFlowTarget;
};
