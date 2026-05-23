# SPDX-License-Identifier: Apache-2.0
#
# Copyright (C) 2023 ImmortalWrt.org

include $(TOPDIR)/rules.mk

PKG_VERSION:=1.1
PKG_RELEASE:=1

LUCI_TITLE:=LuCI app for dae dashboard
LUCI_DEPENDS:=+daed
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
