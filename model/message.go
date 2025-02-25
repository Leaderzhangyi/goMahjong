package model

// Message 表示WebSocket消息
type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}
