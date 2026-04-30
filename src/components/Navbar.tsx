"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  List,
  X,
  ChatCircle,
  SignOut,
  Gear,
  User as UserIcon,
  Globe,
  Storefront,
  SquaresFour,
  Sun,
  Moon,
  Translate,
} from "phosphor-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useListings } from "@/hooks/use-listings";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "react-i18next";

export function Navbar() {
  useListings();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const [profile, setProfile] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const hasUnread = useUnreadMessages(user?.id);

  useScrollLock(isMobileMenuOpen);

  const NAV_LINKS = [
    { name: t("nav.market"), path: "/marketplace", icon: Storefront },
    { name: t("nav.dashboard"), path: "/dashboard", icon: SquaresFour },
  ];

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data);
      };
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const toggleLanguage = (e: React.MouseEvent) => {
    e.preventDefault();
    const newLang = i18n.language === "fr" ? "en" : "fr";
    i18n.changeLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  const toggleTheme = (e: React.MouseEvent) => {
    e.preventDefault();
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const getAvatarUrl = () =>
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture;
  const getUserName = () =>
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  const renderLogoMenuContent = () => (
    <>
      {user ? (
        <>
          <DropdownMenuItem
            onClick={() => navigate("/profile")}
            className="rounded-xl px-4 py-3 cursor-pointer hover:bg-white/10 flex items-center transition-all text-sm font-light"
          >
            <UserIcon className="mr-3 h-4 w-4 text-primary" />{" "}
            {t("nav.profile")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/settings")}
            className="rounded-xl px-4 py-3 cursor-pointer hover:bg-white/10 flex items-center transition-all text-sm font-light"
          >
            <Gear className="mr-3 h-4 w-4 text-primary" />{" "}
            {t("nav.settings")}
          </DropdownMenuItem>
        </>
      ) : (
        <DropdownMenuItem
          onClick={() => navigate("/login")}
          className="rounded-xl px-4 py-3 cursor-pointer hover:bg-white/10 flex items-center transition-all text-sm font-light"
        >
          <UserIcon className="mr-3 h-4 w-4 text-primary" /> {t("nav.login")}
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator className="bg-white/10 my-1" />

      <DropdownMenuItem
        onClick={toggleLanguage}
        className="rounded-xl px-4 py-3 cursor-pointer hover:bg-white/10 flex items-center justify-between transition-all text-sm font-light"
      >
        <div className="flex items-center">
          <Translate className="mr-3 h-4 w-4 text-blue-400" />
          {t("lang.switch")}
        </div>
        <img
          src={i18n.language === "fr" ? "/france.png" : "/royaume-uni.png"}
          alt={i18n.language === "fr" ? "French Flag" : "English Flag"}
          className="w-5 h-5 object-contain"
          loading="lazy"
          decoding="async"
        />
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={toggleTheme}
        className="rounded-xl px-4 py-3 cursor-pointer hover:bg-white/10 flex items-center transition-all text-sm font-light"
      >
        {theme === "dark" ? (
          <Moon className="mr-3 h-4 w-4 text-slate-300" />
        ) : (
          <Sun className="mr-3 h-4 w-4 text-yellow-400" />
        )}
        {theme === "dark" ? t("theme.dark") : t("theme.light")}
      </DropdownMenuItem>

      {user && (
        <>
          <DropdownMenuSeparator className="bg-white/10 my-1" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-400 rounded-xl px-4 py-3 cursor-pointer hover:bg-red-500/20 flex items-center transition-all text-sm font-light"
          >
            <SignOut className="mr-3 h-4 w-4" /> {t("nav.logout")}
          </DropdownMenuItem>
        </>
      )}
    </>
  );

  return (
    <>
      <div
        className="h-[100px] sm:h-[120px] w-full pointer-events-none shrink-0"
        aria-hidden="true"
      />

      <nav className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[100] w-[94%] max-w-6xl pointer-events-none">
        <div className="bg-black/10 backdrop-blur-sm border border-white/10 shadow-lg px-4 sm:px-6 py-3 sm:py-3.5 rounded-full flex items-center justify-between relative overflow-visible pointer-events-auto min-h-[72px]">
          <div className="flex items-center gap-2 sm:gap-6">
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                to="/"
                className="relative z-10 flex items-center shrink-0 mr-1 sm:mr-4"
                title={t("nav.home")}
              >
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-14 sm:h-16 w-auto object-contain transition-transform hover:scale-105"
                />
              </Link>

              <Link
                to="/app"
                className={`flex w-9 h-9 sm:w-10 sm:h-10 items-center justify-center rounded-full transition-all ${location.pathname === "/app" ? "text-white bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                title={t("nav.map")}
              >
                <Globe className="w-[18px] h-[18px]" />
              </Link>

              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`flex w-9 h-9 sm:w-10 sm:h-10 items-center justify-center rounded-full transition-all ${location.pathname === link.path ? "text-white bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                    title={link.name}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </Link>
                );
              })}

              <div className="hidden sm:flex items-center gap-1 ml-1 sm:ml-2 border-l border-white/20 pl-2 sm:pl-3">
                <button
                  onClick={toggleLanguage}
                  className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-transparent transition-all text-xl"
                  title={t("lang.switch")}
                >
                  <img
                    src={
                      i18n.language === "fr"
                        ? "/france.png"
                        : "/royaume-uni.png"
                    }
                    alt={
                      i18n.language === "fr" ? "French Flag" : "English Flag"
                    }
                    className="w-6 h-6 object-contain"
                  />
                </button>
                <button
                  onClick={toggleTheme}
                  className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-transparent text-white/70 hover:text-white transition-all"
                >
                  {theme === "dark" ? (
                    <Moon className="w-[18px] h-[18px]" />
                  ) : (
                    <Sun className="w-[18px] h-[18px]" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <NotificationsMenu user={user} />

                <Link
                  to="/messages"
                  className="hidden sm:flex relative items-center justify-center text-white/60 hover:text-white transition-colors outline-none group p-1.5 sm:p-2 cursor-pointer"
                >
                  <ChatCircle
                    className="w-5 h-5 sm:w-[22px] sm:h-[22px] group-hover:scale-110 transition-transform duration-300"
                    weight="regular"
                  />
                  {hasUnread && (
                    <span className="absolute top-1 right-1.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] border border-[#2b2a2f]" />
                  )}
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full overflow-hidden outline-none hover:scale-105 transition-transform hover:ring-2 hover:ring-white/20 ml-2 sm:ml-1">
                      <Avatar className="h-full w-full rounded-full">
                        <AvatarImage
                          src={getAvatarUrl()}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-primary/30 text-white font-medium text-sm">
                          {getUserName().charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-64 liquid-glass-heavy border border-white/10 text-white rounded-[1.5rem] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-[110] overflow-hidden"
                    align="end"
                    sideOffset={16}
                  >
                    <DropdownMenuLabel className="px-4 py-3 mb-1">
                      <p className="text-sm font-medium">{getUserName()}</p>
                      <p className="text-[10px] text-white/50 truncate">
                        {user.email}
                      </p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10 mb-1" />
                    {renderLogoMenuContent()}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="text-white/60 hover:text-white hover:bg-white/10 px-4 rounded-full h-10 transition-all font-light"
                  >
                    {t("nav.login")}
                  </Button>
                </Link>
                <Link to="/login" state={{ mode: "signup" }}>
                  <Button className="bg-primary text-white hover:bg-primary/90 px-5 rounded-full h-10 transition-all font-medium">
                    {t("nav.signup")}
                  </Button>
                </Link>
              </div>
            )}

            <Link to="/app" className="hidden sm:block">
              <Button className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-5 h-10 font-medium rounded-full transition-all shadow-none ring-0 outline-none focus:ring-0">
                {t("nav.explore")}
              </Button>
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors pointer-events-auto ml-1"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[999] bg-[#2b2a2f]/40 backdrop-blur-2xl flex flex-col p-6 overflow-hidden"
          >
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.08, 0.15, 0.08] }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -top-[10%] -left-[20%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[100px]"
              />
            </div>

            <div className="relative z-10 flex justify-between items-center mb-8">
              <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                <img src="/logo.png" alt="Logo" className="h-12 object-contain" />
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative z-10 flex flex-col gap-6 flex-1 justify-center px-4">
              <Link
                to="/app"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-2xl font-medium text-white tracking-tight flex items-center gap-4"
              >
                <Globe className="w-6 h-6 text-white/50" /> {t("nav.map")}
              </Link>
              {NAV_LINKS.map((link, i) => {
                const Icon = link.icon;
                return (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * (i + 1) }}
                  >
                    <Link
                      to={link.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-2xl font-light text-white/80 hover:text-white transition-colors flex items-center gap-4"
                    >
                      <Icon className="w-6 h-6 opacity-50" /> {link.name}
                    </Link>
                  </motion.div>
                );
              })}
              {user && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Link
                    to="/messages"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-2xl font-light text-white/80 hover:text-white transition-colors flex items-center gap-4"
                  >
                    <ChatCircle className="w-6 h-6 opacity-50" />{" "}
                    {t("nav.messages")}{" "}
                    {hasUnread && (
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                    )}
                  </Link>
                </motion.div>
              )}
            </div>

            <div className="relative z-10 pt-8 border-t border-white/10 flex flex-col items-start gap-3 mt-auto w-full px-4">
              {!user ? (
                <div className="flex flex-col items-start gap-3 w-full">
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/login");
                    }}
                    className="w-fit px-8 h-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-white font-light text-base transition-all shadow-none"
                  >
                    {t("nav.login")}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/login", { state: { mode: "signup" } });
                    }}
                    className="w-fit px-8 h-12 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 hover:bg-primary/40 text-white font-medium text-base transition-all shadow-none"
                  >
                    {t("nav.signup")}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate("/profile");
                  }}
                  className="w-fit px-8 h-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-white font-light text-base transition-all shadow-none"
                >
                  {t("nav.profile")}
                </Button>
              )}

              <div className="flex items-center gap-2 mt-2">
                <Button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate("/app");
                  }}
                  className="w-fit px-8 h-12 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 text-white font-medium text-base transition-all shadow-none"
                >
                  {t("nav.explore")}
                </Button>
                <div className="flex gap-2">
                  <Button
                    onClick={toggleLanguage}
                    variant="ghost"
                    className="w-12 h-12 rounded-full bg-transparent border-none p-0 text-white shadow-none hover:bg-transparent"
                  >
                    <img
                      src={i18n.language === "fr" ? "/france.png" : "/royaume-uni.png"}
                      alt="Flag"
                      className="w-6 h-6 object-contain"
                    />
                  </Button>
                  <Button
                    onClick={toggleTheme}
                    variant="ghost"
                    className="w-12 h-12 rounded-full bg-transparent border-none p-0 text-white shadow-none hover:bg-transparent"
                  >
                    {theme === "dark" ? (
                      <Moon className="w-5 h-5" />
                    ) : (
                      <Sun className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}