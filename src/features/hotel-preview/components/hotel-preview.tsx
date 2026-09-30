import type { ReactNode } from "react"
import { ArrowUp, BedDouble, Clock3, MapPin, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
export function HotelPreview({ heroSlot }: { heroSlot: ReactNode }) {
    return (
        <div className="demo-page">
            <div className="site-topline">
                THE MERIDIAN <span>HOTEL & RESIDENCES</span>
            </div>
            <nav className="site-nav" aria-label="Demo website navigation">
                <span className="wordmark">
                    the meridian<span className="wordmark-star">✦</span>
                </span>
                <div className="nav-links">
                    <span>Rooms & suites</span>
                    <span>Dining</span>
                    <span>Experiences</span>
                </div>
                <Button variant="outline" size="sm">
                    Explore stays <ArrowUp size={14} className="nav-arrow" />
                </Button>
            </nav>
            <main className="hero">
                <div className="hero-content">
                    <p className="kicker">WELCOME TO THE MERIDIAN</p>
                    <h1>
                        A quieter way
                        <br />
                        to <em>stay.</em>
                    </h1>
                    <p className="hero-description">
                        Thoughtful stays, personal service, and a place to slow
                        down. This sample page shows how the chatbox floats over
                        a WordPress hotel site.
                    </p>
                    <div className="hero-actions">
                        <Button>
                            Discover our rooms{" "}
                            <ArrowUp size={16} className="nav-arrow" />
                        </Button>
                        <span className="hero-note">
                            <span className="hero-note-line" /> A stay worth
                            remembering
                        </span>
                    </div>
                    {heroSlot}
                </div>
                <div className="hero-art" aria-hidden="true">
                    <div className="art-sun" />
                    <div className="art-arch art-arch--rear" />
                    <div className="art-arch art-arch--front" />
                    <div className="art-floor" />
                    <div className="art-vase" />
                    <div className="art-leaf art-leaf--one" />
                    <div className="art-leaf art-leaf--two" />
                </div>
            </main>
            <div className="site-benefits">
                <span>
                    <BedDouble size={19} /> Considered comfort
                </span>
                <span>
                    <MapPin size={19} /> An exceptional location
                </span>
                <span>
                    <ShieldCheck size={19} /> Here for every detail
                </span>
                <span>
                    <Clock3 size={19} /> At your convenience
                </span>
            </div>
        </div>
    )
}
