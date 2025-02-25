package main

import (
	"goMahjong/api"
	"goMahjong/config"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
)

func main() {
	var Loc, _ = time.LoadLocation("Asia/Shanghai")
	time.Local = Loc
	engine := gin.Default()

	// logger init
	logger := config.GetZapLogger()

	// config init
	config.Init()
	logger.Info("config init success")

	// 初始化路由
	api.Init(engine)

	// start server
	port := viper.GetString("server.port")
	logger.Info("server start at port " + port)
	engine.Run(":" + port)
}
