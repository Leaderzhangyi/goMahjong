package api

import (
	"goMahjong/handler"
	"goMahjong/service"

	"github.com/gin-gonic/gin"
)

func Init(engine *gin.Engine) {
	gameManager := service.NewGameManager()
	// 设置静态文件目录
	engine.Static("/static", "./static")
	engine.LoadHTMLGlob("templates/*")

	// router init
	engine.GET("/", handler.IndexHandler)
	engine.GET("/room/:roomID", handler.RoomHandler)
	engine.GET("/create", handler.CreateRoomHandler)
	engine.GET("/join", handler.JoinRoomHandler)

	// WebSocket连接
	engine.GET("/ws/:roomID", func(c *gin.Context) {
		handler.HandleWebSocket(c, gameManager)
	})

	// API路由
	api := engine.Group("/api")
	{
		api.GET("/rooms", handler.GetRoomsHandler(gameManager))
		api.POST("/room/create", handler.CreateRoomAPIHandler(gameManager))
		api.POST("/room/join", handler.JoinRoomAPIHandler(gameManager))
	}
}
