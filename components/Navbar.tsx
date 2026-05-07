// icons-import
import { Bell } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="w-full md:w-10/12 lg:w-7/12 mx-auto flex items-center justify-between p-4">
      <h1 className="text-3xl font-bold text-green-950 font-fjallaOne tracking-widest">
        Cinder
      </h1>
      <div className="flex items-center gap-2">
        <div className="">
          <input
            type="text"
            placeholder="Search event..."
            className="border border-green-950 w-[300px] p-1 rounded-lg font-poppins text-sm focus:outline-0"
          />
        </div>
        <button>
          <Bell fill="black" size={20} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
