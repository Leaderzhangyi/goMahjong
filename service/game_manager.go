package service

import (
	"goMahjong/model"
	"sync"
)

// GameManager 游戏管理器，管理所有房间
type GameManager struct {
	rooms map[string]*model.Room
	mutex sync.RWMutex
}

// NewGameManager 创建一个新的游戏管理器
func NewGameManager() *GameManager {

	return &GameManager{
		// make不填先填长度，默认长度为0
		rooms: make(map[string]*model.Room),
	}
}

// CreateRoom 创建一个新房间
func (gm *GameManager) CreateRoom(password string) (*model.Room, error) {
	gm.mutex.Lock()
	defer gm.mutex.Unlock()

	room := model.NewRoom(password)
	gm.rooms[room.ID] = room

	return room, nil
}

// GetRoom 获取指定ID的房间
func (gm *GameManager) GetRoom(roomID string) *model.Room {
	gm.mutex.RLock()
	defer gm.mutex.RUnlock()

	return gm.rooms[roomID]
}

// RemoveRoom 移除指定ID的房间
func (gm *GameManager) RemoveRoom(roomID string) {
	gm.mutex.Lock()
	defer gm.mutex.Unlock()

	delete(gm.rooms, roomID)
}

// GetAllRooms 获取所有房间
func (gm *GameManager) GetAllRooms() []*model.Room {
	gm.mutex.RLock()
	defer gm.mutex.RUnlock()

	rooms := make([]*model.Room, 0, len(gm.rooms))
	for _, room := range gm.rooms {
		rooms = append(rooms, room)
	}

	return rooms
}
